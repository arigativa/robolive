javac -d classes src/main/java/org/zoolu/net/*.java src/main/java/org/zoolu/sound/*.java src/main/java/org/zoolu/sound/codec/*.java src/main/java/org/zoolu/sound/codec/amr/*.java src/main/java/org/zoolu/sound/codec/g711/*.java src/main/java/org/zoolu/sound/codec/g726/*.java src/main/java/org/zoolu/sound/codec/gsm/*.java src/main/java/org/zoolu/util/*.java src/main/java/org/mjsip/rtp/*.java src/main/java/org/mjsip/sdp/*.java src/main/java/org/mjsip/sdp/field/*.java src/main/java/org/mjsip/media/*.java src/main/java/org/mjsip/net/*.java
javac -classpath classes -d classes src/main/java/org/mjsip/sip/address/*.java src/main/java/org/mjsip/sip/authentication/*.java src/main/java/org/mjsip/sip/call/*.java src/main/java/org/mjsip/sip/dialog/*.java src/main/java/org/mjsip/sip/header/*.java src/main/java/org/mjsip/sip/message/*.java src/main/java/org/mjsip/sip/provider/*.java  src/main/java/org/mjsip/sip/transaction/*.java
javac -classpath classes -d classes src/main/java/org/mjsip/ua/*.java src/main/java/org/mjsip/ua/cli/*.java src/main/java/org/mjsip/ua/gui/*.java
javac -classpath classes -d classes src/main/java/org/mjsip/server/*.java src/main/java/org/mjsip/server/sbc/*.java
cd classes
jar -cf ../lib/sip.jar org/zoolu org/mjsip/rtp org/mjsip/sdp org/mjsip/sip -C ../lib COPYRIGHT.txt -C ../lib license.txt
jar -cf ../lib/ua.jar org/mjsip/media org/mjsip/net org/mjsip/ua -C ../resources media/voip/application/ua -C ../lib COPYRIGHT.txt -C ../lib license.txt
jar -cf ../lib/server.jar org/mjsip/net org/mjsip/server -C ../lib COPYRIGHT.txt -C ../lib license.txt
cd ..
