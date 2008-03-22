#!/bin/sh -x

zip -9 -ur contentpackmaker.xpi chrome defaults install.rdf chrome.manifest -x \*/.\*
