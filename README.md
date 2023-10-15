# nibepi
<i>README in other languages: [English](https://github.com/anerdins/nibepi/blob/master/README.en.md)</i><br><br>

![alt text](https://github.com/bebben88/NibePi/blob/master/pics/nibepi-pic.jpg)
NibePi är en IoT produkt för din Nibe värmepump.
Med en Raspberry Pi Zero+RS485 HAT så kommunicerar NibePi med pumpen via Modbus. NibePi får plats innanför skalet på Värmepumpen och matas direkt från kretskortet i pumpen. NibePi stödjer Nibe F370,F470,F730,F750,F1145,F1245,F1155,F1255,VVM225,310,320,325,500.SMO40<br>
Grunden i automatisering och styrning av pumpen är baserad på NodeJS och Node-RED. Det finns även möjligheter att kunna redigera fritt.<br>

En viktig aspekt i hela projektet är att det måste vara en driftsäker lösning. Sönderskrivna SD-kort bör inte kunna hända på en NibePi eftersom att systemet körs i read-only. Detta gör den väldigt driftsäker.<br>

Fler funktioner kommer att byggas till och optimeras löpande. Det går även att uppdatera NibePi direkt via webinterfacet för att få tillgång till de senaste funktionerna.<br>
I webinterfacet finns information samt möjligheter för att starta om hårdvara eller mjukvara.

<b>Hårdvara som behövs</b>

Rpi Zero W:<br>
https://thepihut.com/products/raspberry-pi-zero-w<br>
https://www.kiwi-electronics.nl/raspberry-pi-zero-w<br>
https://www.electrokit.com/produkt/raspberry-pi-zero-wh/<br>
RS485 HAT:<br>
https://thepihut.com/products/rs485-pizero?variant=26469099976<br>
https://www.kiwi-electronics.nl/rs-485-pi<br>
https://www.abelectronics.co.uk/p/77/rs485-pi<br>
https://www.m.nu/utbyggnadskort/wide-input-shim-kit<br>
12V HAT:<br>
https://thepihut.com/products/wide-input-shim<br>
https://www.kiwi-electronics.nl/wide-input-shim<br>
https://www.electrokit.com/produkt/wide-input-shim-3-16v/<br>
SD-kort:<br>
https://www.clasohlson.com/se/MicroSDHC-SDXC-minneskort-Klass-10,-Kingston/38-5562<br>

Löd på anslutningskontakter på A och B på RS485 kortet. Stacka sedan ihop alla kort, antingen med headers eller löd dom rätt på varandra för minsta möjliga bygghöjd.<br>

Ladda ner en fullständig image fil att skriva till ett 16GB SD kort.<br>
Kolla in den officiella sidan
https://energy.anerdins-iot.se<br>

På boot partionen (som även är tillgänglig i windows) ligger det en fil som heter wpa_supplicant.conf Där skriver du in dina wifi uppgifter.
```
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=SE

network={
	ssid="WIFINAMN"
	psk="WIFILÖSEN"
	key_mgmt=WPA-PSK
}
```
Ändra filen enligt ovan och spara.<br>

```
Installera NibePi
Steg 1: Ta bort den övre luckan där luftfiltret sitter (Gäller endast vid frånluftspumpar).
Steg 2: Skruva bort de två stora torx T30 skruvarna längst ner i botten på fronten.
Steg 3: Luta ut fronten i nederkant 10-20 cm och lyft fronten uppåt (Den hänger på en skena i ovankant.
Steg 4: Ställ undan fronten.
Steg 5: Ta bort det lilla snäpplocket enl. bild nedan
```
![alt text](https://github.com/bebben88/NibePi/blob/master/pics/nibepi_1.jpg)
```
Steg 6: Anslut NibePi enl. bild nedan.
Inkopplingen kan skilja sig från olika värmepumpar https://www.nibe.fi/nibedocuments/15050/031725-6.pdf 
```
![alt text](https://github.com/bebben88/NibePi/blob/master/pics/nibepi_2.jpg)
```
Steg 7: Stoppa in SD-kortet. Starta värmepumpen med fronten av så länge.
```
```
Aktivera Modbus i Värmepumpen.
Steg 1: Håll in bakåt knappen i ca 7 sekunder, en service meny kommer upp, gå in i den.
Steg 2: Gå in i meny 5.2 Systeminställningar ( I vissa pumpar är det ytterligare ett menyval )
Steg 3: Nästan längst ner i den menyn bockar man för "Modbus".
Steg 4: Pumpen kan nu börja lysa rött om NibePi inte har startat ordentligt än, vilket kan ta några minuter.
```


Node-RED är nu tillgängligt på NibePi's adress. http://nibepi:1880<br>
Webinterfacet är tillgängligt på http://nibepi:1880/ui<br>
Om det ovanstående länkar inte fungerar så använd IP adressen istället. T.ex http://192.168.0.100:1880

Om du söker nytt elavtal får du gärna använda min affiliate länk och bli kund hos Tibber. <a href="https://invite.tibber.com/587354e8">https://invite.tibber.com/587354e8</a><br>

Om du uppskattar mitt arbete så kan du bjuda mig på lite kaffe på nedanstående länk.

https://www.buymeacoffee.com/0oKFXbQ
