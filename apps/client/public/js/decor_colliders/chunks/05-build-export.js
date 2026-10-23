// buildDecorColliders + export — extrait de decor_colliders.js (IIFE)
function buildDecorColliders(spec) {
    if (!spec) return [];
    if (spec.prefabId === 'road_barrier_rail' && spec.railSeg) {
      const baseY = Number.isFinite(spec.baseY) ? spec.baseY : 0;
      return [{
        type: 'seg',
        x0: spec.railSeg.x0,
        z0: spec.railSeg.z0,
        x1: spec.railSeg.x1,
        z1: spec.railSeg.z1,
        r: 0.14,
        baseY,
        maxY: baseY + 0.78,
        decorId: spec.decorId,
      }];
    }
    const {
      x = 0, z = 0, baseY = 0,
      rotY = 0, rotX = 0, scale: scaleIn = 1,
      wreckTilt = 0,
      rotZ = 0,
      railLen,
    } = spec;
    const scale = scaleIn ?? 1;
    const railLenScale = (spec.prefabId === 'road_barrier_rail' && Number.isFinite(railLen))
      ? railLen
      : null;
    const isWreck = spec.prefabId?.startsWith('wreck_');
    const tiltZ = isWreck ? (Number(wreckTilt) || Number(rotZ) || 0) : 0;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const out = [];

    for (const raw of _defsForSpec(spec)) {
      if (!raw) continue;
      let def = _applyLayFlat(raw, spec);
      if (raw.door && spec.doorOpen) {
        const angle = Number.isFinite(spec.doorAngle) ? spec.doorAngle : DOOR_OPEN_ANGLE;
        def = _transformOpenDoorLeaf(def, angle);
      }
      const lx0 = (def.lx || 0) * (railLenScale ?? scale);
      const lz0 = (def.lz || 0) * (railLenScale ?? scale);
      const hw = (def.hw || 0.1) * (railLenScale ?? scale);
      const hd = (def.hd || 0.1) * scale;

      if (def.type === 'cyl' || def.r != null) {
        const ox = lx0 * cos + lz0 * sin;
        const oz = -lx0 * sin + lz0 * cos;
        out.push({
          x: x + ox,
          z: z + oz,
          r: (def.r || 0.1) * scale,
          topY: def.topY != null ? baseY + def.topY * scale : undefined,
          decorId: spec.decorId,
        });
        continue;
      }

      if (isWreck) {
        out.push({
          type: 'box',
          cx: x,
          cz: z,
          lx: lx0,
          lz: lz0,
          hw,
          hd,
          rotY,
          rotZ: tiltZ,
          baseY,
          maxY: def.maxY != null ? baseY + def.maxY * scale : undefined,
          minY: def.minY != null ? baseY + def.minY * scale : undefined,
          decorId: spec.decorId,
          wreckPart: true,
        });
        continue;
      }

      out.push({
        type: 'box',
        cx: x,
        cz: z,
        lx: lx0,
        lz: lz0,
        hw,
        hd,
        rotY,
        rotX: def.rotX ?? rotX ?? 0,
        localRotY: def.localRotY || 0,
        baseY,
        maxY: def.maxY != null ? baseY + def.maxY * scale : undefined,
        minY: def.minY != null ? baseY + def.minY * scale : undefined,
        decorId: spec.decorId,
        prefabId: spec.prefabId,
      });
    }
    return out;
  }

  function listPrefabColliderIds() {
    return Object.keys(PREFAB_COLLIDERS).filter((id) => (PREFAB_COLLIDERS[id] || []).length > 0);
  }

  window.ZS = window.ZS || {};
  ZS.buildDecorColliders = buildDecorColliders;
  ZS.listPrefabColliderIds = listPrefabColliderIds;
  ZS.DECOR_PREFAB_COLLIDERS = PREFAB_COLLIDERS;
  ZS.DECOR_ITEM_COLLIDERS = ITEM_COLLIDERS;
  ZS.WRECK_BODY = WRECK_BODY;
