<img src="https://github.com/Ali-Rezaali/UC4D/blob/main/UC4D%20Banner.png" alt="UC4D Banner" width="100%" />

### ✱ **UC4D: Urban Climate 4D Framework (Code)**

[![DOI (Data)](https://img.shields.io/badge/Data_Zenodo-10.5281%2Fzenodo.22723885-blue?style=flat-square&logo=zenodo)](https://doi.org/10.5281/zenodo.22723885)
[![DOI (Code)](https://img.shields.io/badge/Code_Zenodo-10.5281%2Fzenodo.22865045-green?style=flat-square&logo=zenodo)](https://doi.org/10.5281/zenodo.22865045)
[![License: MIT](https://img.shields.io/badge/Code_License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Google Earth Engine](https://img.shields.io/badge/Platform-Google_Earth_Engine-4285F4?style=flat-square&logo=google-earth)](https://earthengine.google.com/)
[![Python 3](https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python)](https://www.python.org/)

**UC4D** is a **multi-scale** (spatially at 10 m and ~926.6 m; temporally static, seasonal, and annual), **multi-source** spatiotemporal data cube for urban climate studies, mainly demonstrated for **Tehran (Iran)** and **Singapore**. It integrates Sentinel-1 SAR, Sentinel-2 optical, FABDEM topography, 3D urban morphology, VIIRS nighttime lights, WorldPop population density, and bias-corrected, downscaled ERA5/ERA5-Land atmospheric fields. 

This repository holds the complete framework code: Google Earth Engine (GEE) scripts, Python notebooks, and auxiliary files.

> ℹ️ **Companion Data:** Data specifications, Tiers (FINP, CORP, LCZP), spatial domains, methods, and validation are described in the companion paper (*to be published*) and the [data record](https://doi.org/10.5281/zenodo.22723885).

---

#### 📂 **Repository Structure**

> The repository is logically divided into Earth Engine scripts (`.js`), Python Notebooks (`.ipynb`), and auxiliary scripts and JSONs.

```text
UC4D/
├── 01 GEE Scripts/
│   ├── Utilities/
│   │   ├── 01 WorldPop Ingestion Check.js
│   │   ├── 02 LCZ-TIRP Statistics.js
│   │   ├── 03 GLCM Range Calibration.js
│   │   ├── 04 Visualization Palettes.js
│   │   └── 05 VIIRS Overpass Resolver.js
│   ├── 01 Configurations.js
│   ├── 02 Spatial Domains.js
│   ├── 03 Urban 3D Morphology.js
│   ├── 04 Multi-Source Feature Library.js
│   ├── 05 Multi-Scale Cube Assembly.js
│   ├── 06 ERA5-Land Correction Library.js
│   ├── 07 ERA5-Land Downscaling.js
│   ├── 08 Technical Validation.js
│   ├── 09 Global Coverage Audit.js
│   └── 10 UC4D Explorer.js
│
├── 02 Python Notebooks/
│   ├── 01 WorldPop Automation & Ingestion.ipynb
│   ├── 02 GHCN-h Automated Download.ipynb
│   ├── 03 LCZ-TIRPs Converter.ipynb
│   ├── 04 ERA5-Land Validation.ipynb
│   ├── 05 Technical Validation.ipynb
│   └── 06 UC4D Explorer.ipynb
│
└── 03 Auxiliary/
    ├── Countries.json
    └── UC4D-Visualization.js
```

---

#### ⚙️ **Framework Workflow**

The UC4D framework is executed sequentially across two environments.

##### **Phase 1:** ***Data Ingestion & Pre-processing (Python)***

[1]  **`01 WorldPop Automation`:** Uses `geeup` to download WorldPop `R2024B` constrained 100-m GeoTIFFs, intersects them with city domains, and ingests them into GEE.

[2]  **`02 GHCN-h Automated Download`:** Fetches NOAA GHCN-h PSV files. It deduplicates stations per ERA5-Land pixel, extracts the observation closest to the VIIRS-LST overpass time (±30 min), and ingests the CSVs into GEE as assets.

[3]  **`03 LCZ-TIRPs Converter`:** Converts *Google My Maps* KMZ files into Shapefiles. Computes spatial-independence statistics (pairwise distances) and uploads the cleaned, ordered and re-colored LCZ samples to GEE.

##### **Phase 2:** ***Core Cube Generation & Downscaling (GEE)***

[1]  **`01 Configurations.js` & `02 Spatial Domains.js`:** Sets up the 20-city registry (Tehran and Singapore as main and 18 secondary cities), auto-detects UTM CRS, and generates the Holdout, Training, Complete, SUHI, and LCZ domains.

[2]  **`03 Urban 3D Morphology.js`:** Fuses FABDEM, GBA, AW3D30, and WSF to calculate Building Height (BH), Sky View Factor (SVF), Building Coverage Ratio (BCR), Std Dev Height (SDH), and Frontal Area Index (FAI). Special gap-filling is applied to Tehran.

[3] **`04 Multi-Source Feature Library.js`:** The core feature library. SAR temporal aggregation is performed strictly in linear power space before being converted back to dB, followed by the calculation of the VV - VH difference. Optical processing applies Cloud Score+ (cs_cdf > 0.8) masking and computes 12 spectral and physical indices (NDVI, MSAVI2, NDWI, NDMI, NDRE, BSI, MNDWI, EVI2, BLFEI, FVC, Emissivity, Albedo). It extracts 64 GLCM texture layers generated from VH, VV, B12, and B8 bands across 4 metrics and 4 window sizes. Additionally, VIIRS NTL and WorldPop Population Density are handled and filtered in this library module.

[4]  **`05 Multi-Scale Cube Assembly.js`:** Assembles the FINP, CORP, and LCZP / LCZP-GLCM tiers and exports them to GEE Assets.

[5]  **`06 ERA5-Land Correction` & `07 ERA5-Land Downscaling.js`:** Trains Random Forest models to predict residuals between ERA5-Land and GHCN-h stations, and then applies Two-Pass Residual Correction (TPRC) (via coarse aggregation, Gaussian smoothing, and closure delta) to downscale T2M, WS, and SM to 10 m. Solar Radiation is downscaled using geometric downscaling (hillshade-based).

##### **Phase 3:** ***Validation & Exploration***

[1] **`08 Technical Validation.js`:** Executes validation suites (Composite Coverage, Speckle Suppression, Physical Range, Temporal Consistency, Cross-Index Plausibility, etc.) and exports CSVs.

[2]  **`04` & `05` Python Notebooks:** Render validation heatmaps and statistical figures from the GEE CSVs.

[3]  **`10 UC4D Explorer.js` & `06 UC4D Explorer.ipynb`:** Provides an interactive UI. The Python notebook uses `xarray` and `xee` to lazily extract Zarr-backed datasets.

---

#### 💻 **Hardware & System Requirements**

UC4D runs on Windows 10/11, macOS, or Linux. The minimum is a dual-core CPU, 8 GB RAM, 2 GB of disk (repo plus sample data), and a broadband connection. For full runs, 64-bit Windows 11 or Linux (Ubuntu 22.04+) is recommended, with 8+ CPU cores for parallel raster processing, 16 GB RAM for large raster grids, 20+ GB of disk for the full ERA5-Land/WorldPop raw feeds, and a high-speed connection for the GEE API and automated downloads.

> ⚠️ **Note for GEE Users:** Earth Engine usage is metered in EECU-seconds (Earth Engine Compute Unit seconds). Under the current Community tier you get 540,000 EECU-seconds per month *for each project*. Some scripts, such as the 3D Urban Morphology and CORP assembly, are compute-heavy. Choose your domain carefully: larger domains, finer resolution, and downscaling or upscaling all increase compute and run time. Test on a small subset before running the full domain.

---

#### ▶️ **Execution Guide**

##### **Step 1:** ***Google Earth Engine Setup***

[1] Open the [GEE Code Editor](https://code.earthengine.google.com/).

[2] Upload the `01 GEE Scripts` directory to your GEE repository (e.g., `users/YourUsername/UC4D`) or use the repository link (recommended).

[3] Update the `ProjectName` and `Repository` variables in `01 Configurations.js`.

[4] Run `02 Spatial Domains.js` to generate city boundaries and other spatial domains.

[5] Run `03 Urban 3D Morphology.js` to compute 3D metrics.

[6] Run `05 Multi-Scale Cube Assembly.js` to generate and export the multi-tier (FINP, CORP & LCZP) assets.

##### **Step 2:** ***Python Ingestion (Google Colab)***

[1] Open the notebooks in `02 Python Notebooks` via Google Colab.

[2] **Notebook `01 WorldPop` & `02 GHCN-h`:** Follow the cell instructions to mount your Google Drive and use `geeup` to authenticate and ingest WorldPop and GHCN-h data into your GEE project.

[3] **Notebook `03 LCZ-TIRPs`:** If you have your own LCZ data, convert KMZ to shapefiles and upload them.

##### **Step 3:** ***ERA5-Land Bias Correction & Downscaling***

[1] In GEE, run `06 ERA5-Land Correction Library.js` to bias correct the inputs, train Random Forest models and apply TPRC.

[2] Run `07 ERA5-Land Downscaling.js` to downscale the inputs into 10 m UTM grids.

[3] Open `04 ERA5-Land Validation.ipynb` in Colab to generate the accuracy metrics heatmaps.

##### **Step 4:** ***Explore UC4D***

[✱] Run `10 UC4D Explorer.js` in GEE or use the published GEE Web App: https://alirezaali.users.earthengine.app/view/uc4d 

[✱]  Run `06 UC4D Explorer.ipynb` in Colab to use the Python `UC4D` client class for point profiles and `xarray` extraction.

---

#### 📚 **Citation & Licensing**

If you use this code or the data cube, please cite both the dataset and the code:

**Dataset:**

> Rezaali, A., & Pilehforooshha, P. (2026). UC4D: Urban Climate 4D Data Cube (Version 1.0) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.22723885
  
**Code:**

> Rezaali, A., & Pilehforooshha, P. (2026). UC4D: Urban Climate 4D Data Cube Framework (Version 1.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22865045

#### **License**

**Data:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | **Code:** [MIT License](https://opensource.org/licenses/MIT)

---

**Contact:** AliRezaaliGeo@gmail.com  
