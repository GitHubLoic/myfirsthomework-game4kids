#!/usr/bin/env python3
"""Build each spoken word and its natural beginning from the SAME recording."""
import argparse,array,hashlib,json,math,subprocess,sys,wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RATE=22050

def pcm_write(path,data):
    values=array.array('h',data)
    if sys.byteorder!='little':values.byteswap()
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(values.tobytes())
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--sources',type=Path,required=True)
    args=parser.parse_args()
    sources=json.loads((args.sources/'sources.json').read_text())
    out=ROOT/'assets/words';out.mkdir(exist_ok=True)
    manifest={}
    for letter,info in sources.items():
        src=args.sources/info['file']
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(src),'-f','f32le','-ac','1','-ar',str(RATE),'-'])
        values=array.array('f');values.frombytes(raw)
        if sys.byteorder!='little':values.byteswap()
        frame=int(.01*RATE)
        energies=[math.sqrt(sum(v*v for v in values[i:i+frame])/len(values[i:i+frame])) for i in range(0,len(values),frame)]
        threshold=max(energies)*.045
        active=[i for i,v in enumerate(energies) if v>threshold]
        first=max(0,active[0]*frame-int(.04*RATE))
        last=min(len(values),(active[-1]+1)*frame+int(.045*RATE))
        data=list(values[first:last])
        peak=max(abs(v) for v in data) or 1
        data=[round(v*.75/peak*32767) for v in data]
        # Only remove clicks at the outer edges; preserve the recording's timing and pitch.
        n=int(.005*RATE)
        for i in range(n):data[i]=round(data[i]*i/n)
        n=int(.015*RATE)
        for i in range(n):data[-1-i]=round(data[-1-i]*i/n)
        duration=len(data)/RATE
        prefix_seconds=min(.34,max(.18,duration*.5),duration-.035)
        prefix=data[:int(prefix_seconds*RATE)]
        n=min(int(.025*RATE),len(prefix)//4)
        for i in range(n):prefix[-1-i]=round(prefix[-1-i]*i/n)
        word_hash=pcm_write(out/(letter+'.wav'),data)
        prefix_hash=pcm_write(out/(letter+'-start.wav'),prefix)
        manifest[letter]={
            'word':info['word'],'file':letter+'.wav','start_file':letter+'-start.wav',
            'source':info['source'],'source_page':info['page'],'author':info['author'],
            'license':info['license'],'license_url':info['license_url'],
            'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
            'sha256':word_hash,'start_sha256':prefix_hash,
            'trim_seconds':[first/RATE,last/RATE],'duration_seconds':duration,
            'start_seconds':len(prefix)/RATE,'fade_out_seconds':n/RATE,
            'adaptation':'Silence trimmed; mono PCM 22050 Hz; shared peak gain. Beginning is the first part of the SAME word recording, with a 25 ms fade-out. No repetition, looping, stretching or isolated-consonant assembly.'
        }
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(manifest)} natural words and their beginnings built in {out}')
if __name__=='__main__':main()
