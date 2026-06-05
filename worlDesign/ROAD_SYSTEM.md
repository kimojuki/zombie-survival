# ROAD_SYSTEM.md

# Road Network Design

> **Implémentation technique (code)** : voir [docs/ROAD_NETWORK.md](../docs/ROAD_NETWORK.md)  
> Module : `public/js/road_network.js` — refonte 2026-06-05

Roads are EXTREMELY important for world readability.

The map must contain:

## Main Roads

Large asphalt roads connecting:

* city
* villages
* industrial zone
* military base

Features:

* road markings
* broken sections
* abandoned vehicles — **placement centralisé** : `public/js/vehicles.js` (le long des routes RoadNetwork, pas dans les bâtiments)
* utility poles
* road signs

---

## Secondary Roads

Smaller roads leading to:

* farms
* cabins
* hidden loot locations

---

## Dirt Roads

Used inside forests and rural zones.

Should feel:

* natural
* irregular
* overgrown

---

# Roadside Details

Roads should NEVER be empty.

Add:

* crashed cars
* military checkpoints
* zombie corpses
* barricades
* broken fences
* gas stations
* buses
* traffic jams near cities

---

# World Navigation

Roads must naturally guide players toward:

* points of interest
* loot zones
* safe zones
* dangerous areas

The player should be able to navigate without a minimap simply by following roads and landmarks.
