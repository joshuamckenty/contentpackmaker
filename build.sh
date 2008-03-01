#!/bin/sh -x

# Need license file here

# JMC: Usage Notes
# These extensions are only going to work as xpis, not open folders
# This is because the zip is composited from two sources, the common content
# and the affiliate-specific content
# 

# TODO - SANITY CHECK THAT $AFFILIATE IS SET HERE!

here=`pwd`
parsefiles="chrome/content/affiliateskin.css chrome/content/affiliateskin.xul chrome/content/contentpack.js defaults/preferences/affiliateskin.js chrome/content/mediachannel.css chrome/content/load-contentpack-coop.js"

cd $here/../common/
for parseme in $parsefiles; do
  cp $parseme $parseme.build-bak
  sed -e "s/\%affiliate\%/$affiliate/g" -i '' $parseme
done

cd $here/../common/chrome
zip -9 -ur "$here/chrome/$affiliate.jar" content locale skin -x \*/CVS/\* -x \*/.\* -x \*.build-bak
cd $here/chrome
zip -9 -ur $affiliate.jar content locale skin -x \*/CVS/\* -x \*/.\* -x \*.build-bak


cd $here/../common
zip -9 -ur "$here/$affiliate.xpi" components defaults -x \*/CVS/\* -x \*/.\* -x components/\*.idl -x components/xptgen -x \*.build-bak

cd $here
cp chrome.manifest .\#chrome.manifest.bak
cat ../common/chrome.manifest >> chrome.manifest
sed -e "s/\%affiliate\%/$affiliate/g" -i '' chrome.manifest
# sed -E -e "s/^((content|skin|locale)\s+(\S+\s+)(\S+\s+)?)chrome\//\1jar:chrome\/$affiliate.jar!\//g" -i '' chrome.manifest

cd $here
zip -9 -ur $affiliate.xpi chrome/$affiliate.jar components defaults install.rdf chrome.manifest -x \*/CVS/\* -x \*/.\* -x components/\*.idl -x components/xptgen -x \*.build-bak

# Restore the backed up chrome.manifest file.
mv -f .\#chrome.manifest.bak chrome.manifest
cd $here/../common/
for parseme in $parsefiles; do
  mv -f $parseme.build-bak $parseme
done
