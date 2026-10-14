# Hiyaw Ertiro — portfolio

Live site: https://hiyawtaken.github.io/portfolio/

Minecraft-themed portfolio with eight project write-ups, experience, skills, education, leadership, and About Me. Includes a rotating splash, panorama, audio controls, motion settings, project search, and an enchantment-style skill selector.

## Hosting

This is a static GitHub Pages build for the `/portfolio` base path. Publish `main` from the repository root. `.nojekyll` preserves the `_next` and `_pages` assets. Every route has its own `index.html`, so bookmarked project pages and browser refreshes work.

`pages-runtime.js` supplies the existing client with static navigation payloads. The contact book opens a draft in the visitor's email app; no contact submissions are collected or stored by GitHub Pages.

`content.json` contains the readable content inventory. Project details include evaluation dates and baseline comparisons. This repository contains public portfolio content and assets; local-server outboxes, test data, and workspace files are excluded.

## Credits

The visual design and preserved client assets originate from [Rayyan Haider's Minecraft portfolio](https://rayyanhai.dev/). Personal content is Hiyaw Ertiro's. The title was generated with [CreativeStar's Minecraft Title Generator](https://creativestar.store/en/tools/minecraft-title-generator), using models and textures from Ewan Howell and contributors. Minecraft is a trademark of Mojang/Microsoft; this is an unofficial personal portfolio.
