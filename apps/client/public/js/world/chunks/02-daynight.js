// Cycle jour/nuit, étoiles — extrait de world.js (IIFE)
function setWorldTime(t) {
    if (!_beachIntroGoldenHour) _timeOfDay = t;
  }
  function getWorldTime() { return _beachIntroGoldenHour ? BEACH_INTRO_GOLDEN_TIME : _timeOfDay; }
  function setBeachIntroGoldenHour(on) {
    _beachIntroGoldenHour = !!on;
    if (!on && typeof _timeOfDay !== 'number') _timeOfDay = 0.3;
  }
  function isBeachIntroGoldenHour() { return _beachIntroGoldenHour; }

  function getFoliageDayBlend() {
    const angle = _timeOfDay * Math.PI * 2;
    const sunY = Math.sin(angle - Math.PI * 0.5);
    return Math.max(0, Math.min(1, (sunY + 0.06) / 0.48));
  }

  // Centre du frustum d'ombre (suit le joueur) — mis à jour depuis la boucle de jeu.
  let _shadowCX = 0, _shadowCZ = 0;
  function setShadowCenter(x, z) { _shadowCX = x; _shadowCZ = z; }
  const _skyDir = new THREE.Vector3();
  const _skyUp = new THREE.Vector3(0, 1, 0);
  const _skyRight = new THREE.Vector3();
  const _skyLocalDir = new THREE.Vector3();
  const _skyCamQuat = new THREE.Quaternion();
  const _skyRootQuat = new THREE.Quaternion();
  const _fogWork = new THREE.Color();
  const _fogBeach = new THREE.Color(0x6aacc8);
  const _fogForest = new THREE.Color(0x6a8a68);
  const _hemiForestGround = new THREE.Color(0x5a7a48);
  let _dnFrame = 0;

  function tickDayNight(dt) {
    _dnFrame++;
    const gpEarly = _optsProfile();
    const dnStride = gpEarly?.dayNightStride ?? 1;
    const dnLite = dnStride > 1 && (_dnFrame % dnStride) !== 0;
    if (dt > 0 && !_beachIntroGoldenHour) {
      _timeOfDay += dt / _DAY_LENGTH_SEC;
      if (_timeOfDay >= 1) {
        _timeOfDay -= 1;
        _dayCount++;
      }
    }
    const renderTod = _beachIntroGoldenHour ? BEACH_INTRO_GOLDEN_TIME : _timeOfDay;
    const angle = renderTod * Math.PI * 2;
    const sunY  = Math.sin(angle - Math.PI * 0.5);
    const sunX  = Math.cos(angle - Math.PI * 0.5);
    const phase = _moonPhase();
    const moonIllum = _moonIllumination(phase);
    const moonNight = Math.max(0, -sunY);
    const moonIntensity = moonNight * moonIllum * 0.85;
    const cam = ZS._camera;
    const skyAnchorY = cam?.position?.y ?? 24;
    const camFar = cam?.far ?? 175;
    const skySpriteRadius = Math.max(96, camFar - 22);
    const skyLightRadius = Math.max(skySpriteRadius + 10, camFar - 18);

    _skyRight.set(1, 0, 0);
    _skyDir.copy(_skyRight).multiplyScalar(sunX).addScaledVector(_skyUp, sunY).normalize();
    if (_skyRoot && cam) {
      if (_skyRoot.parent !== cam) cam.add(_skyRoot);
      _skyRoot.position.set(0, 0, 0);
      _skyRoot.quaternion.copy(_skyRootQuat.copy(cam.quaternion).invert());
    }

    // Soleil/lune positionnés autour du joueur pour que l'ombre serrée le suive.
    _sunLight.position.set(
      _shadowCX + _skyDir.x * skyLightRadius,
      skyAnchorY + _skyDir.y * skyLightRadius,
      _shadowCZ + _skyDir.z * skyLightRadius
    );
    if (_sunLight.target) _sunLight.target.position.set(_shadowCX, 0, _shadowCZ);
    _moonLight.position.set(
      _shadowCX - _skyDir.x * skyLightRadius,
      skyAnchorY - _skyDir.y * skyLightRadius,
      _shadowCZ - _skyDir.z * skyLightRadius
    );
    if (_sunSprite) {
      if (cam && _sunSprite.parent !== cam) cam.add(_sunSprite);
      _skyLocalDir.copy(_skyDir);
      if (cam) _skyLocalDir.applyQuaternion(_skyCamQuat.copy(cam.quaternion).invert());
      _sunSprite.position.copy(_skyLocalDir.multiplyScalar(skySpriteRadius));
      _sunSprite.visible = sunY > -0.02;
      _sunSprite.material.opacity = Math.max(0, Math.min(1, sunY * 1.2 + 0.2));
      _sunSprite.scale.setScalar(Math.max(18, skySpriteRadius * 0.11));
    }
    if (_moonSprite) {
      _ensureMoonPhaseTexture(phase);
      if (cam && _moonSprite.parent !== cam) cam.add(_moonSprite);
      _skyLocalDir.copy(_skyDir).multiplyScalar(-1);
      if (cam) _skyLocalDir.applyQuaternion(_skyCamQuat.copy(cam.quaternion).invert());
      _moonSprite.position.copy(_skyLocalDir.multiplyScalar(skySpriteRadius));
      _moonSprite.visible = sunY < 0.12;
      _moonSprite.material.opacity = Math.max(0.18, moonNight * (0.45 + moonIllum * 0.85));
      _moonSprite.scale.setScalar(Math.max(12, skySpriteRadius * 0.075));
    }
    if (_starField && _starMat) {
      _starField.visible = moonNight > 0.02;
      _starMat.opacity = Math.max(0, Math.min(0.95, moonNight * 1.15));
    }

    const k = _interpKey(sunY, _KEYS);
    _sunLight.intensity     = k.sunI;
    _moonLight.intensity    = moonIntensity;
    _ambientLight.intensity = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _fogWork.setHex(k.sky);
    const bwFog = ZS.beachCoastWeight?.(_shadowCX, _shadowCZ) ?? 0;
    if (bwFog > 0.04) _fogWork.lerp(_fogBeach, Math.min(0.5, bwFog * 0.5));
    const fwFog = ZS.forestFloorWeight?.(_shadowCX, _shadowCZ) ?? 0;
    if (fwFog > 0.04) _fogWork.lerp(_fogForest, Math.min(0.42, fwFog * 0.42));
    _scene.fog.color.copy(_fogWork);

    // Hémisphère : rebond sol plus clair sous le couvert forestier
    _hemiLight.color.setHex(k.sky);
    let hemiI = 0.06 + k.ambI * 0.22 + moonIntensity * 0.08;
    if (fwFog > 0.12) {
      hemiI += Math.min(0.14, fwFog * 0.16);
      _hemiLight.groundColor.copy(_hemiForestGround);
    } else {
      _hemiLight.groundColor.setHex(0x2a4a18);
    }
    _hemiLight.intensity = hemiI;

    // Brouillard de nuit moins agressif (profil options)
    const night = Math.max(0, Math.min(1, -sunY * 1.8));
    const gp = _optsProfile();
    const fogNearBase = gp?.fogNear ?? 140;
    const fogFarDay = gp?.fogFar ?? 420;
    const fogFarNight = gp?.fogFarNight ?? 220;
    _scene.fog.near = fogNearBase - night * Math.min(75, fogNearBase * 0.45);
    _scene.fog.far = fogFarDay - night * (fogFarDay - fogFarNight);
    if (dnLite) return;

    // Eau : scintillement animé (désactivé sur profils sans animation océan)
    if (_waterMats.length > 0 && (_waterAnimEnabled || _oceanScrollEnabled)) {
      const wt  = Date.now() * 0.001;
      const rip = 0.14 + Math.sin(wt * 0.65) * 0.07 + Math.sin(wt * 1.38) * 0.04;
      const dBr = 0.35 + k.ambI * 0.65; // plus brillant de jour
      for (const m of _waterMats) {
        m.emissiveIntensity = rip * dBr;
        if (_oceanScrollEnabled && m.map && m.userData._oceanScroll) {
          m.map.offset.y = (wt * 0.018) % 1;
        }
      }
    }

    const foliageDay = Math.max(0, Math.min(1, (sunY + 0.06) / 0.48));
    if (Math.abs(foliageDay - _lastFoliageDay) > 0.025) {
      _lastFoliageDay = foliageDay;
      ZS.tickTreeLighting?.(foliageDay);
      ZS.tickBeachLighting?.(foliageDay);
      ZS.tickForestLighting?.(foliageDay);
    }
    const waterStride = gp?.waterStride ?? 1;
    if (_waterSurfaces.length > 0 && _waterAnimEnabled) {
      _waterAnimTick++;
      if (_waterAnimTick % waterStride === 0) {
        const wt = Date.now() * 0.001;
        const doNormals = _waterAnimTick % (5 * waterStride) === 0;
        for (const ws of _waterSurfaces) {
          const pos = ws.mesh.geometry.attributes.position;
          const base = ws.base;
          for (let i = 0; i < pos.count; i++) {
            const bx = base[i * 3];
            const by = base[i * 3 + 1];
            const bz = base[i * 3 + 2];
            const wave =
              Math.sin(wt * ws.speed + bx * 0.09 + bz * 0.05) * ws.amp +
              Math.sin(wt * (ws.speed * 1.7) + bx * 0.16 - bz * 0.12) * (ws.amp * 0.45);
            pos.setY(i, by + wave);
          }
          pos.needsUpdate = true;
          if (doNormals) ws.mesh.geometry.computeVertexNormals();
        }
      }
    }

    // Nuages
    if (_clouds.length > 0 && _cloudMat) {
      if (dt > 0) {
        for (const c of _clouds) {
          c.azimuth += c.speed * dt;
        }
      }
      const cloudNightFade = Math.max(0.16, 1 - moonNight * 0.72);
      const cloudOpacity = 0.18 + (1 - moonNight) * 0.68;
      for (const c of _clouds) {
        const cosEl = Math.cos(c.elevation);
        c.sprite.position.set(
          Math.cos(c.azimuth) * cosEl * c.radius,
          Math.sin(c.elevation) * c.radius,
          Math.sin(c.azimuth) * cosEl * c.radius
        );
        c.sprite.scale.set(c.scale * (1.8 + Math.max(0, sunY) * 0.12), c.scale, 1);
      }
      // Couleur nuage interpolée
      const ck = _interpCloudKey(sunY);
      _cloudMat.color.setRGB(ck.r * cloudNightFade, ck.g * cloudNightFade, ck.b * cloudNightFade);
      _cloudMat.opacity = cloudOpacity;
      _cloudMat.emissiveIntensity = 0.02 + Math.max(0, -sunY) * 0.05;
    }

    if (_fireLights.length > 0) {
      const t = Date.now();
      const f = 0.82 + Math.sin(t * 0.011) * 0.09 + Math.sin(t * 0.019) * 0.06 + Math.sin(t * 0.034) * 0.04;
      const nightBoost = 0.4 + night * 1.1;
      for (const fl of _fireLights) {
        const base = fl.baseIntensity ?? 2.2;
        fl.light.intensity = f * base * nightBoost;
        if (fl.mesh) fl.mesh.scale.y = 0.85 + f * 0.22;
        if (fl.onTick) fl.onTick(t, f, night);
      }
    }

    if (_wallClocks.length > 0) {
      ZS.applyWallClockHands?.(_wallClocks, _timeOfDay, Date.now());
    }
  }

  // ── Interpolations ────────────────────────────────────────────────────────────

  function _ss(t) { return t * t * (3 - 2 * t); } // smoothstep

  function _interpKey(sunY, keys) {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        const al = _ss((sunY - a.t) / (b.t - a.t));
        if (b.sky !== undefined) {
          _cA.setHex(a.sky); _cB.setHex(b.sky);
          const sky = _cA.lerp(_cB, al).getHex();
          _cA.setHex(a.amb); _cB.setHex(b.amb);
          const amb = _cA.lerp(_cB, al).getHex();
          return { sky, amb, ambI: a.ambI + (b.ambI - a.ambI) * al, sunI: Math.max(0, a.sunI + (b.sunI - a.sunI) * al) };
        }
      }
    }
    return keys[keys.length - 1];
  }

  function _interpCloudKey(sunY) {
    for (let i = 0; i < _CK.length - 1; i++) {
      const a = _CK[i], b = _CK[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        const al = _ss((sunY - a.t) / (b.t - a.t));
        return { r: a.r + (b.r - a.r) * al, g: a.g + (b.g - a.g) * al, b: a.b + (b.b - a.b) * al };
      }
    }
    return _CK[_CK.length - 1];
  }

  function spawnStars() {
    if (!_skyRoot) return;
    const prof = _optsProfile();
    const count = prof?.starCount ?? (_isMobileBuild() ? 64 : 240);
    const radius = 168;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const az = _rng() * Math.PI * 2;
      const el = 0.12 + _rng() * 0.78;
      const cosEl = Math.cos(el);
      pos[i * 3] = Math.cos(az) * cosEl * radius;
      pos[i * 3 + 1] = Math.sin(el) * radius;
      pos[i * 3 + 2] = Math.sin(az) * cosEl * radius;
      sizes[i] = 1 + _rng() * 1.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    _starMat = new THREE.PointsMaterial({
      map: _starTex,
      color: 0xeaf2ff,
      transparent: true,
      opacity: 0,
      size: 1.6,
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.08,
      blending: THREE.AdditiveBlending,
    });
    _starField = new THREE.Points(g, _starMat);
    _starField.frustumCulled = false;
    _skyRoot.add(_starField);
  }

  // ── Bruit pour le terrain ────────────────────────────────────────────────────

  function _tvh(x, z) { const n = Math.sin(x * 91.3 + z * 157.7) * 43758.5453; return n - Math.floor(n); }
  function _tvn(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const lp = (a, b, t) => a + (b - a) * t;
    return lp(lp(_tvh(xi, zi), _tvh(xi+1, zi), ux), lp(_tvh(xi, zi+1), _tvh(xi+1, zi+1), ux), uz);
  }

  // ── Couleur terrain : hauteur + noise ────────────────────────────────────────

  function _terrainColor(x, z, h) {
    const fw = ZS.forestFloorWeight?.(x, z) ?? 0;

    if (fw > 0.12) {
      let base;
      if (h < 0) base = 0x5a6e52;
      else if (h < 4) base = 0x627658;
      else if (h < 8) base = 0x6a8060;
      else if (h < 14) base = 0x748a6a;
      else base = 0x7e9474;

      const n1 = _tvn(x * 0.045, z * 0.045);
      const n2 = _tvn(x * 0.18, z * 0.18);
      const n = n1 * 0.58 + n2 * 0.42;
      _cT.setHex(base);
      if (n > 0.62) {
        _cD.setHex(0x8a7048); _cT.lerp(_cD, 0.28 * fw);
      } else if (n < 0.22) {
        _cD.setHex(0x4e6248); _cT.lerp(_cD, 0.18 * fw);
      } else if (n > 0.38 && n < 0.55) {
        _cD.setHex(0x7a9468); _cT.lerp(_cD, 0.16 * fw);
      }
      return _cT.getHex();
    }

    let base;
    if      (h < -4) base = 0x283c28;
    else if (h <  0) base = 0x325830;
    else if (h <  3) base = 0x3e6834;
    else if (h <  6) base = 0x4a7438;
    else if (h < 10) base = 0x5e7040;
    else if (h < 16) base = 0x7a7050;
    else             base = 0x888070;

    if (h >= 14) return base;

    const n1 = _tvn(x * 0.04, z * 0.04);
    const n2 = _tvn(x * 0.16, z * 0.16);
    const n3 = _tvn(x * 0.55, z * 0.55);
    const n  = n1 * 0.50 + n2 * 0.32 + n3 * 0.18;

    _cT.setHex(base);
    if (n > 0.70) {
      _cD.setHex(h < 4 ? 0x7a5530 : 0x8a6840); _cT.lerp(_cD, 0.55);
    } else if (n > 0.60) {
      _cD.setHex(0x8c8838); _cT.lerp(_cD, 0.36);
    } else if (n < 0.20) {
      _cD.setHex(0x285a28); _cT.lerp(_cD, 0.34);
    } else if (n > 0.48 && n3 < 0.28 && h < 5) {
      _cD.setHex(0x9aaa3a); _cT.lerp(_cD, 0.18);
    }
    return _cT.getHex();
  }

  function _terrainTint(x, z, h, slope, useDirt) {
    const fw = ZS.forestFloorWeight?.(x, z) ?? 0;

    if (useDirt) {
      if (fw > 0.15) {
        _cT.setHex(h > 12 ? 0x8a7860 : 0x7a6850);
        if (slope > 0.5) {
          _cD.setHex(0x5a4838); _cT.lerp(_cD, Math.min(0.22, slope * 0.18));
        } else if (_tvn(x * 0.2, z * 0.2) < 0.3) {
          _cD.setHex(0x9a8060); _cT.lerp(_cD, 0.12);
        }
        return _cT.getHex();
      }
      _cT.setHex(h > 13 ? 0x817760 : 0x7c5e38);
      if (slope > 0.6) {
        _cD.setHex(0x4b3724); _cT.lerp(_cD, Math.min(0.34, slope * 0.28));
      } else if (_tvn(x * 0.18, z * 0.18) < 0.28) {
        _cD.setHex(0x9f7c4b); _cT.lerp(_cD, 0.16);
      }
      return _cT.getHex();
    }

    _cT.setHex(_terrainColor(x, z, h));
    if (fw > 0.2) {
      if (_tvn(x * 0.3, z * 0.3) < 0.18) {
        _cD.setHex(0x5a6e50); _cT.lerp(_cD, 0.1 * fw);
      } else if (_tvn(x * 0.12 + 5, z * 0.12 - 3) > 0.72) {
        _cD.setHex(0x8a7050); _cT.lerp(_cD, 0.1 * fw);
      }
      return _cT.getHex();
    }
    if (_tvn(x * 0.25, z * 0.25) > 0.7) {
      _cD.setHex(0x70953f); _cT.lerp(_cD, 0.18);
    } else if (_tvn(x * 0.22 + 13, z * 0.22 - 7) < 0.2) {
      _cD.setHex(0x2d602c); _cT.lerp(_cD, 0.22);
    }
    return _cT.getHex();
  }

  function _beachSandColor(x, z) {
    const n = _tvn(x * 0.07, z * 0.07);
    const nearShore = x > 278;
    _cT.setHex(nearShore ? 0xc8b080 : 0xdcc8a0);
    if (n > 0.62) {
      _cD.setHex(nearShore ? 0xb0a070 : 0xc8b888); _cT.lerp(_cD, 0.2);
    } else if (n < 0.32) {
      _cD.setHex(nearShore ? 0xd8c8a8 : 0xf0e4c8); _cT.lerp(_cD, 0.18);
    }
    return _cT.getHex();
  }

  function _optsProfile() {
    return ZS.Options?.getProfile?.() || null;
  }

  function _isMobileBuild() {
    const p = _optsProfile();
    if (p) return p.tier !== 'high';
    return !!(ZS.detectTouchInput?.() || window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
  }

  function _terrainSeg() {
    const p = _optsProfile();
    if (p) return p.terrainSeg;
    return _isMobileBuild() ? 28 : 44;
  }

  let _oceanScrollEnabled = true;

  function _applyShadowFrustum(fr) {
    if (!_sunLight?.shadow) return;
    const h = fr ?? 58;
    _sunLight.shadow.camera.left = -h;
    _sunLight.shadow.camera.right = h;
    _sunLight.shadow.camera.top = h;
    _sunLight.shadow.camera.bottom = -h;
    _sunLight.shadow.camera.updateProjectionMatrix?.();
  }

  function _setCloudBudget(n) {
    const max = Math.max(0, n ?? 0);
    for (let i = 0; i < _clouds.length; i++) {
      _clouds[i].sprite.visible = i < max;
    }
  }
