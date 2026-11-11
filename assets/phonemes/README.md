# Sons oraux des lettres

Ces fichiers font entendre le son à produire avec la bouche, pas le nom alphabétique de la lettre. Ils sont lus localement avec Web Audio, sans confier « t », « m » ou « s » à la synthèse vocale du navigateur.

## Références et licences

Source pédagogique et fichiers de référence : [Parle — French sound chart](https://getparle.app/french-sound-chart/), Tingnova Inc.

- Les références synthétisées de Parle sont sous [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Les enregistrements API de **Peter Isotalo**, repris par Parle depuis Wikimedia Commons, sont sous [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Les extraits `g.wav`, `m.wav`, `n.wav`, `z.wav` et le composé `gz.wav` sont diffusés sous cette même licence.

`manifest.json` associe chaque fichier à son auteur, sa licence, l’URL de sa référence, les bornes de l’extrait et les empreintes SHA-256. Les licences des sons s’appliquent à ces enregistrements et adaptations.

## Adaptations

Certaines références comportent une voyelle autour de la consonne. L’extrait conserve la consonne et retire cette voyelle : il ne s’agit pas de faire entendre « bé », « esse » ou « té ». Les consonnes continues sont prolongées à partir de leur segment isolé ; les occlusives sont proposées en trois petits relâchements séparés, sans ajouter de voyelle. Des fondus et une normalisation de crête évitent les clics et les grands écarts de volume. Les voyelles sont débarrassées de leur silence et limitées à une émission courte.

Les fichiers sont du PCM WAV mono, 22 050 Hz. Le script `scripts/build-phonemes.py` reproduit ces adaptations depuis les références M4A et les crédits JSON, avec ffmpeg.

## Correspondance avec les images

Le son dépend du mot repère : C comme carotte et Q comme quille utilisent /k/ ; G comme grenouille utilise /ɡ/ ; W comme wagon utilise /v/ en français de France ; X comme xylophone commence par /ɡz/ ; Y comme yoyo utilise /j/. O est associé à orange pour /ɔ/, et E à escargot pour /ɛ/.

Des lettres qui font le même son ne sont pas proposées ensemble dans une question. Le H de hibou n’a pas de son : cette exception est expliquée oralement et visuellement, sans inventer de son /h/ ni lire le nom « ache ».
