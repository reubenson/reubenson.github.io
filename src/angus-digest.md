---
layout: project.njk
title: Chrome Extension for Angus
---
# {{ title }}
For a more comprehensive document on this project's details, see [https://docs.google.com/document/d/1RjRnJIjkyPl6uC9Z3opkGyDu06oviXyZvfpIfjY4jAU](https://docs.google.com/document/d/1RjRnJIjkyPl6uC9Z3opkGyDu06oviXyZvfpIfjY4jAU)

## Source Code
[version 0.4 download](/extensions/extension_v0_4.zip) [12.30.2023]
- adding Facebook Marketplace listings, using the 8 locales (with 500 mile radius) used by SearchTemepest

[version 0.3 download](/extensions/extension_v0_3.zip) [12.22.2023]
- extends previous version (0.2) with bugfixes, better filtering, and most importantly, displays results in reverse-chronological order, which makes it much easier to QA and compare against the email digest, or in manually searching Craigslist

[version 0.2 download](/extensions/extension_v0_2.zip) [12.18.2023]
- this version runs through the three "Large Area" options listed by SearchTempest in the "Group Links By" filter

[version 0.1 download](/extensions/extension_v0_1.zip) [12.12.2023]
- this version can be ignored now, it was just a proof of concept

## Installation
- Download the bundled source code for this extension above and unzip it. You'll probably want to save it to your Documents folder, or wherever is easy to keep track of it.
- Follow [Google's instructions here on how to "Load an unpacked extension"](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked), using the directory containing the source code from the previous step. If you have already installed a previous version of the extension, you'll want to remove the old version, and "load an unpacked extension" again with the new version.
- Now that the extension is installed, you can pin it to your extensions bar. The extension is currently represented by a small motorcycle-emoji (🏍) icon.
- You may continue browsing on other tabs or windows while this is running, but do not close the side-panel, or otherwise use the tab that the extension is running in.