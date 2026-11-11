#!/usr/bin/env python3
"""Build fixed phoneme clips from the credited open references (requires ffmpeg)."""
import argparse, array, hashlib, json, math, subprocess, sys, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATE = 22050
# Keep the consonant, excluding the neighboring vowel in the reference recording.
CUTS = {
    'b': (.46, .70), 'd': (.35, .47), 'k': (.31, .40), 'g': (.18, .245),
    'p': (.065, .17), 't': (.135, .25), 'f': (.25, .405), 'v': (.085, .20),
    's': (.395, .54), 'z': (.205, .345), 'm': (.235, .375), 'n': (.27, .43),
    'l': (.435, .525), 'r': (.605, .67), 'j': (.89, 1.105), 'semi_j': (.14, .26),
}
STOPS = {'b', 'd', 'k', 'g', 'p', 't'}
IPA = {'a':'a','b':'b','d':'d','k':'k','g':'ɡ','p':'p','t':'t','f':'f','v':'v','s':'s','z':'z','m':'m','n':'n','l':'l','r':'ʁ','j':'ʒ','semi_j':'j','i':'i','y':'y','e_ouvert':'ɛ','o_ouvert':'ɔ','gz':'ɡz'}
NAMES = list(IPA.keys())[:-1]

def fade(data, seconds=.006):
    data = list(data)
    n = min(int(RATE * seconds), len(data)//3)
    for i in range(n):
        factor = i/max(n-1,1)
        data[i] *= factor
        data[-1-i] *= factor
    return data

def prolong(data, duration=.48):
    result = list(data)
    overlap = min(int(.018*RATE), len(data)//4)
    while len(result) < duration*RATE:
        end = result[-overlap:]
        mixed = [end[i]*(1-i/overlap)+data[i]*(i/overlap) for i in range(overlap)]
        result[-overlap:] = mixed
        result.extend(data[overlap:])
    return fade(result[:int(duration*RATE)])

def write(path, data):
    peak = max(abs(x) for x in data) or 1
    data = [max(-1,min(1,x*.75/peak)) for x in data]
    values = array.array('h', (round(x*32767) for x in data))
    if sys.byteorder != 'little': values.byteswap()
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(values.tobytes())
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--credits', type=Path, required=True)
    args = parser.parse_args()
    credits = json.loads(args.credits.read_text())
    out = ROOT/'assets/phonemes';out.mkdir(exist_ok=True)
    manifest = {}; segments = {}
    for name in NAMES:
        src = args.source_dir/(name+'.m4a')
        raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(src),'-f','f32le','-ac','1','-ar',str(RATE),'-'])
        samples = array.array('f'); samples.frombytes(raw)
        if sys.byteorder != 'little': samples.byteswap()
        if name in CUTS:
            start,end = CUTS[name]; data = list(samples[int(start*RATE):int(end*RATE)])
        else:
            peak = max(abs(x) for x in samples)
            active = [i for i,x in enumerate(samples) if abs(x) > peak*.035]
            start = max(0,active[0]/RATE-.015);end = min(active[-1]/RATE+.02,start+.65)
            data = list(samples[int(start*RATE):int(end*RATE)])
        segments[name] = fade(data)
        if name in STOPS:
            # Three short releases, separated by silence, without an added vowel.
            sound = (fade(data)+[0.0]*int(.12*RATE))*3
        elif name in CUTS and name != 'semi_j': sound = prolong(data)
        else: sound = fade(data)
        sound = [0.0]*int(.035*RATE)+sound+[0.0]*int(.07*RATE)
        url = 'https://getparle.app/audio/phonemes/phoneme_'+name+'.m4a'
        original = credits.get(url)
        license_url = original['license'] if original else 'https://creativecommons.org/licenses/by/4.0/'
        author = original['creator']['name'] if original else 'Tingnova Inc. / Parle'
        digest = write(out/(name+'.wav'),sound)
        manifest[name] = {'ipa':IPA[name],'file':name+'.wav','source':url,'author':author,'license':license_url,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'sha256':digest,'extract_seconds':[start,end],'adaptation':'Consonant isolated from surrounding vowel; sustained where appropriate, brief stops repeated 3 times; faded, peak-normalized, converted to mono PCM WAV.' if name in CUTS else 'Silence trimmed; faded, peak-normalized, converted to mono PCM WAV.'}
        if original:manifest[name]['original_reference']=original.get('isBasedOn',{}).get('url')
    sound = segments['g'] + prolong(segments['z'],.36)
    digest = write(out/'gz.wav',[0.0]*int(.035*RATE)+fade(sound)+[0.0]*int(.07*RATE))
    manifest['gz']={'ipa':'ɡz','file':'gz.wav','author':'Peter Isotalo','license':'https://creativecommons.org/licenses/by-sa/3.0/','sources':[manifest[k]['source'] for k in ['g','z']],'sha256':digest,'adaptation':'Isolated /ɡ/ joined to isolated /z/ for the beginning of xylophone; faded and peak-normalized.'}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(manifest)} phoneme files built in {out}')
if __name__=='__main__':main()
