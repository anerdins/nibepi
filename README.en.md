# nibepi
Follow this project on Facebook! https://www.facebook.com/groups/nibepi/

NibePi is an IoT product for your Nibe heatpump
With a Raspberry Pi Zero+RS485 HAT you can communicate with your heatpump by serial protocol. NibePi can fit inside the shell of the heatpump and be powered directly from the terminals.
NibePi supports a lot of Nibe heatpumps, including: Nibe F370,F470,F730,F750,F1145,F1245,F1155,F1255,VVM225,310,320,325,500.SMO20-40<br>
The foundation in this product is built on Node.JS and Node-RED. If the project dosent suit your needs completly it's easy to make your own project with this as a base.

One of the main features in this project is that NibePi is a dependable solution, the filesystem runs in a read-only mode and that makes it almost total secure against corrupt SD-cards. Since no data is written to the SD-card regulary it will not be worn out.<br>
Note that data is written to the SD-card when you change a setting in the user interface. <br>
If you appreciate my work, you can sponsor me with a coffee

https://www.buymeacoffee.com/0oKFXbQ

Hardware used in the project.


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
SD-card:<br>
https://www.clasohlson.com/se/MicroSDHC-SDXC-minneskort-Klass-10,-Kingston/38-5562<br>

Solder terminals or wires on A and B at the RS485 card, then stack all the cards together on a header and solder them as tight as possible against eachother for the minimal build height.<br>

Download the complete image and burn to the 16GB SD-card.<br>
http://anerdins.se/NibePi/nibepi_1.1.rar (1.1)<br>

On the boot partition at the SD-card (also available in Windows) there is a file called wpa_supplicant.conf, update with your own wifi credentials and save.
```
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=SE

network={
	ssid="YOUR_WIFI"
	psk="YOUR_PASSWORD"
	key_mgmt=WPA-PSK
}
```

Install NibePi
```
Step 1: Remove the upper hatch, no screws, just take it off.
Step 2: Remove the two large torx T30 screws at the bottom of the heatpump which is holding the big front hatch.
Step 3: Pull the hatch out approx 10-20 cm and lift the whole front off and put it to the side.
Step 5: Remove the snap-in lid, picture below..
```
![alt text](https://github.com/bebben88/NibePi/blob/master/pics/nibepi_1.jpg)
```
Step 6: Connect your NibePi according to the picture below<br>
Please note that the connections can differ from one heatpump to another, check the manual for more info to find the right connections (12v,A,B,GND)
https://www.nibe.fi/nibedocuments/15050/031725-6.pdf 
```
![alt text](https://github.com/bebben88/NibePi/blob/master/pics/nibepi_2.jpg)
```
Step 7: Start the heatpump with the SD-card plugged into NibePi.
```
```
Activate Modbus in the heatpump.
Step 1: Hold the "Back" button for approx 7 seconds, one new service menu will popup, enter it.
Step 2: Go to, System settings 5.2, in some models you have to click another menu to see the list for the possible accessories.
Step 3: Scroll down and look for "Modbus", check it.
Step 4: The heatpump might raise an red alarm if NibePi has not started yet. Or the light will remain green and then the heatpump has a connection to NibePi.
```


Node-RED is now available at NibePi's hostname. http://nibepi:1880<br>
The webinterface for NibePi (based on Node-red) is available at http://nibepi:1880/ui<br>
If the above example doesn't work, please try with NibePis IP address instead of the hostname.

Not it's all done!
If you appreciate my work, you can sponsor me with a coffee

https://www.buymeacoffee.com/0oKFXbQ
