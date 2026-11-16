# SaltScape — Save the water. Don't sacrifice the soil.

A standalone, responsive climate decision simulator built with HTML, CSS, and vanilla JavaScript. **No Streamlit, Node, Python, paid APIs, or external build step.**

## Run locally
Double-click `index.html`. It works offline except the optional Google Fonts import (system fonts are used as fallback).

## Publish free using GitHub Pages
1. Create a **public** GitHub repository named `saltscape-web`.
2. Upload `index.html`, `style.css`, `app.js`, `README.md` to the root of the repository and commit.
3. Open repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, `main`, `/(root)`, and save.
5. The site should appear at `https://YOUR-USERNAME.github.io/saltscape-web/` after GitHub finishes publishing. Do not mistake a 404 during initial publication for a code failure.

## Features
- Three fields (lettuce, tomato, barley), each 1000 m².
- Water shortage, saline irrigation water, and evaporation-demand scenario controls.
- Manual weekly water-budget allocation that must total 100%.
- Eight-week, daily-step water and dissolved-salt inventory model.
- Deterministic 5%-grid optimizer; same full water budget as player.
- Visualization of root-zone salt mass (kg/m²) and unmet water demand (mm).
- Export weekly results as CSV.

## Scientific approach and limitations
This is a **synthetic educational prototype, not a validated digital twin of a physical farm**. Assumptions are fixed within `app.js` and are inspectable. It uses the standard `ETc = Kc × ET0` relationship for estimating crop water demand, then a simplified finite storage/root-zone water balance with drainage and salt input/removal. `1 mm` over `1 m²` equals `1 L`. The source electrical conductivity ECw is converted into approximate dissolved salt concentration with a rough `0.64 g/L per dS/m` factor; real conversion varies by ionic composition. Salt entering irrigation is estimated using total irrigation depth, and salt leaving drainage assumes a well-mixed root zone. No rainfall, soil texture, runoff, seasonal crop stages, osmotic salinity impact on uptake, irrigation timing variability, or evapoconcentration are modeled. Water demand is kept constant across the eight-week *scenario* and is **not a long-range weather forecast**.

**Salt mass per area is NOT soil saturation-extract electrical conductivity (ECe).** The model does not estimate yield, plant survival, crop damage, or economic outcomes. The field status colors represent *water-deficit stress only*. The objective combines normalized weighted water deficit (70%) and positive salt-inventory accumulation (30%), with demonstration weights; it is not a universally optimal agricultural policy. The optimizer checks 231 discretized 5% water-share combinations over three fields; it does not prove a global continuous optimum. The higher-level qualitative explanation, not the absolute scientific validity, is the point of this prototype.

For future scientific improvement, calibrate field-specific soil properties and salinity measurements, use FAO-56 growth-stage crop coefficients, weather-history inputs, more defensible solute transport, and field validation.

## Pitch in 20 seconds
"Most drought tools tell farmers to use less water. But if irrigation is saline, less drainage can mean more salt left in the soil. SaltScape lets you allocate limited water across three fields, see an eight-week simulation, and compare your decision with a constrained optimizer. We make the hidden trade-off visible — without pretending a prototype can predict real farms."
