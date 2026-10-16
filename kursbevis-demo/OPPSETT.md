# Kursbevis-demo – oppsett (ca. 10 min)

Tre filer: `Code.gs`, `Admin.html`, `Registrering.html`.

## 1. Lag prosjektet
1. Gå til sheets.google.com med **din eigen** Google-konto og lag eit nytt, tomt ark. Kall det «Kursbevis».
2. Vel **Utvidingar → Apps Script**.
3. Slett innhaldet i `Code.gs` og lim inn `Code.gs` herifrå.
4. Trykk **+ → HTML** og lag fila `Admin` (utan .html). Lim inn `Admin.html`.
5. Gjer det same for `Registrering`.
6. Trykk **Lagre** (diskettikonet).

## 2. Køyr oppsettet
1. Vel funksjonen `oppsett` i menyen øvst og trykk **Køyr**.
2. Google spør om løyve: **Gå gjennom løyve → vel kontoen → Avansert → Gå til prosjektet (usikkert) → Tillat**.
   (Åtvaringa kjem fordi det er ditt eige skript, ikkje ei app frå butikken.)
3. Gå til `settPin`, skriv ein PIN (minst 6 siffer) mellom hermeteikna, køyr funksjonen, og **slett PIN-en frå koden igjen** og lagre.

## 3. Publiser
1. **Distribuer → Ny distribusjon → Type: Nettapp**.
2. Køyr som: **Meg**. Kven har tilgang: **Alle**.
3. Trykk **Distribuer** og kopier lenkja (slutter på `/exec`). Det er appen.
4. Opne lenkja på mobilen → del → **Legg til på heimskjerm**.

## 4. Test
1. Logg inn med PIN, trykk **Nytt kurs**.
2. Skann QR-koden med ein annan mobil og registrer deg med di eiga e-post.
3. Trykk **Ferdig**. Du skal få kursbeviset, og samla PDF går til `ARKIV_TIL`.

**Under testing:** endre `SVAR_TIL` og `ARKIV_TIL` øvst i `Code.gs` til di eiga e-post, så Ove ikkje får testmailar.

## Når du endrar koden
**Distribuer → Administrer distribusjonar → blyant → Versjon: Ny → Distribuer.** Lenkja blir den same.

## Overføring til Ove seinare
1. Ove opprettar Gmail-kontoen (med totrinnsinnlogging).
2. Du deler arket med han, han opnar det og vel **Fil → Lag ein kopi**. Skriptet blir med.
3. Han køyrer `oppsett`, `settPin` og publiserer (punkt 2–3) i sin konto, med deg på telefon.
4. Set `SVAR_TIL`/`ARKIV_TIL` tilbake til `ovefortun@outlook.com`.

## Tryggleik i demoen
- PIN lagra som hash med salt. Låsing i 15 min etter 5 feil forsøk. Økta varer maks 6 timar.
- Lang tilfeldig kurs-ID i QR-koden. Registrering stengjer når kurset er ferdig.
- Kurset blir låst *før* utsending, så det aldri blir sendt to gonger.
- Maks 60 deltakarar per kurs, sperre mot mange innsendingar, skjult felle-felt mot robotar.
- Same e-post kan ikkje registrerast to gonger på same kurs.
- Alt som blir vist eller lagt i PDF blir escapa (vern mot kodeinjeksjon).
- Namn og e-post blir sletta automatisk 365 dagar etter utsending (dagleg jobb).

## Kjende avgrensingar
- Øvst på sidene viser Google ei lita linje om at appen er laga av ein Apps Script-brukar. Kan ikkje fjernast med gratis Google.
- Gmail-grense: om lag 100 e-postar per døgn på vanleg konto.
- Kursbeviset er ein enkel demo-mal. Byt til Ove sin Word-mal når du får han.
