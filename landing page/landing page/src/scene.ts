import * as THREE from "three";
import { SD } from "./data";

export interface SceneRefs {
  labs: HTMLElement[];
  tags: HTMLElement[];
  rec: HTMLElement;
  ai: HTMLElement;
  onOpenPipeline?: () => void;
}

/** Builds the 3D scene on the sticky stage and returns a cleanup function. */
export function initScene(root: HTMLElement, refs: SceneRefs, onNoGL: () => void): () => void {
    const $ = (s: string) => root.querySelector(s) as HTMLElement;
    const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const sg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
    const ez = (q: number) => q * q * (3 - 2 * q);
    const V = THREE.Vector3;
    const st = $("#st"), sc = root;
    let RD: THREE.WebGLRenderer;
    try {
      RD = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      onNoGL();
      return () => {};
    }
    RD.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    st.insertBefore(RD.domElement, st.firstChild);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55);
    dl.position.set(3, 8, 8);
    scene.add(dl);

    function fade(l: THREE.Material[], o: number) { l.forEach((m) => { m.opacity = o * m.userData.o; }); }
    function glow(c: string) {
      const k = document.createElement("canvas");
      k.width = k.height = 128;
      const g = k.getContext("2d")!;
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, c);
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(k);
    }
    const SHT = glow("rgba(40,50,110,.55)");

    function avatar(c: { shirt: number; skin: number; hair: number; st: number }) {
      const g = new THREE.Group(), ms: THREE.Material[] = [];
      const M = (col: number, o?: number) => { const m = new THREE.MeshLambertMaterial({ color: col, transparent: true }); m.userData.o = o || 1; ms.push(m); return m; };
      const A = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
      const sh = M(c.shirt), sk = M(c.skin), hr = M(c.hair), ey = M(0x23263a);
      A(new THREE.CylinderGeometry(0.3, 0.44, 1.05, 18), sh, 0, 0.55, 0);
      A(new THREE.SphereGeometry(0.34, 18, 12), sh, 0, 1.05, 0).scale.set(1.2, 0.55, 0.8);
      A(new THREE.SphereGeometry(0.28, 20, 16), sk, 0, 1.5, 0);
      const cp = A(new THREE.SphereGeometry(0.3, 20, 12, 0, 6.3, 0, 1.65), hr, 0, 1.52, 0);
      cp.rotation.x = -0.5;
      if (c.st === 1) A(new THREE.CylinderGeometry(0.27, 0.2, 0.6, 14), hr, 0, 1.28, -0.14);
      if (c.st === 2) A(new THREE.SphereGeometry(0.13, 12, 10), hr, 0, 1.83, -0.14);
      [-1, 1].forEach((s) => { A(new THREE.SphereGeometry(0.035, 8, 8), ey, s * 0.1, 1.53, 0.26); });
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ map: SHT, transparent: true, depthWrite: false }));
      b.rotation.x = -Math.PI / 2; b.position.y = 0.01; b.material.userData.o = 0.5;
      ms.push(b.material); g.add(b);
      g.userData.ms = ms;
      return g;
    }

    // students
    let jn = 0;
    const S = SD.map((d, i) => {
      const g = avatar({ shirt: d[2], skin: d[3], hair: d[4], st: d[5] });
      g.rotation.y = Math.PI / 2 - 0.4;
      scene.add(g);
      return { g, ms: g.userData.ms, sel: d[6], j: d[6] ? jn++ : 0, lab: refs.labs[i], e: 0 };
    });

    // recruiter
    const rec = new THREE.Group();
    const rg0 = avatar({ shirt: 0x1e2a5a, skin: 0xe6b08f, hair: 0x2a1e1a, st: 1 });
    const recMs = rg0.userData.ms.slice();
    rec.add(rg0);
    const RB = (w: number, h: number, d: number, col: number, x: number, y: number, z: number) => {
      const m = new THREE.MeshLambertMaterial({ color: col, transparent: true });
      m.userData.o = 1; recMs.push(m);
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z); rec.add(o); return o;
    };
    RB(2, 0.1, 0.9, 0xffffff, 0, 0.78, 0.85); RB(0.1, 0.78, 0.8, 0xffffff, -0.95, 0.39, 0.85); RB(0.1, 0.78, 0.8, 0xffffff, 0.95, 0.39, 0.85);
    RB(0.6, 0.03, 0.42, 0x2a2f55, 0, 0.85, 0.8); RB(0.6, 0.4, 0.03, 0x2a2f55, 0, 1.05, 0.62).rotation.x = -0.2;
    scene.add(rec);
    rec.rotation.y = -Math.PI / 2 + 0.45;
    const recLab = refs.rec;

    // AI core
    const ai = new THREE.Group(), AIm: THREE.Material[] = [];
    const AM = <T extends THREE.Material>(m: T, o: number): T => { m.transparent = true; m.userData.o = o; AIm.push(m); return m; };
    ai.position.set(0, 1.5, 0); scene.add(ai);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), AM(new THREE.MeshBasicMaterial({ color: 0x6f86ff, wireframe: true }), 0.5));
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 24), AM(new THREE.MeshLambertMaterial({ color: 0xdfe5ff, emissive: 0x8b9cff, emissiveIntensity: 0.3 }), 0.5));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 18), AM(new THREE.MeshBasicMaterial({ color: 0x7a6bff }), 1));
    const rg = new THREE.Group();
    ai.add(shell, glass, core, rg);
    [[1.75, 0x4f6bff, 0], [1.95, 0x8b5cf6, 1.1]].forEach((r) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r[0], 0.012, 8, 100), AM(new THREE.MeshBasicMaterial({ color: r[1] }), 0.6));
      t.rotation.x = 1.2 + r[2]; rg.add(t);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283;
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), AM(new THREE.MeshBasicMaterial({ color: 0x4f6bff }), 1));
      n.position.set(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75);
      const h = new THREE.Group(); h.rotation.x = 1.2; h.add(n); rg.add(h);
    }
    const gl = new THREE.Sprite(AM(new THREE.SpriteMaterial({ map: glow("rgba(139,107,255,.55)"), depthWrite: false }), 0.8));
    gl.scale.set(7, 7, 1); ai.add(gl);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), AM(new THREE.MeshBasicMaterial({ map: glow("rgba(110,120,255,.45)"), depthWrite: false }), 1));
    fl.rotation.x = -Math.PI / 2; fl.position.set(0, -1.48, 0); ai.add(fl);
    const pp = new Float32Array(360);
    for (let i = 0; i < 120; i++) {
      const u = Math.random() * 6.283, v = Math.acos(2 * Math.random() - 1), r = 2.1 + Math.random() * 1.3;
      pp[i * 3] = r * Math.sin(v) * Math.cos(u); pp[i * 3 + 1] = r * Math.cos(v) * 0.8; pp[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, AM(new THREE.PointsMaterial({ color: 0x7a8cff, size: 0.06 }), 1));
    ai.add(pts);
    const aiLab = refs.ai;

    // resumes
    function card(n: string, sk: string[]) {
      const k = document.createElement("canvas");
      k.width = 180; k.height = 240;
      const g = k.getContext("2d")!;
      g.fillStyle = "#fff"; g.fillRect(0, 0, 180, 240);
      g.fillStyle = "#eef0fb"; g.fillRect(0, 0, 180, 46);
      g.fillStyle = "#4f6bff"; g.beginPath(); g.arc(26, 23, 12, 0, 6.3); g.fill();
      g.fillStyle = "#12142b"; g.font = "700 17px system-ui,sans-serif"; g.fillText(n, 46, 29);
      g.font = "500 14px system-ui,sans-serif";
      sk.forEach((s, i) => { g.fillStyle = "#12a574"; g.fillText("✓", 14, 80 + i * 26); g.fillStyle = "#12142b"; g.fillText(s, 34, 80 + i * 26); });
      g.fillStyle = "#e4e7f6";
      [150, 150, 80].forEach((w, i) => { g.fillRect(14, 170 + i * 16, w, 6); });
      return new THREE.CanvasTexture(k);
    }
    const CN = new THREE.Color(0xcfd6ff), CG = new THREE.Color(0x12a574), CX = new THREE.Color(0x9aa0b8);
    const R = SD.map((d, i) => {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), new THREE.MeshBasicMaterial({ map: card(d[7].split(" ")[0], d[8]), transparent: true }));
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.3), new THREE.MeshBasicMaterial({ color: 0xcfd6ff, transparent: true }));
      f.position.z = -0.01; g.add(f, c); scene.add(g);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(0, 1.5, 0), new V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0x7a8cff, transparent: true, opacity: 0 }));
      scene.add(ln);
      return { g, c, f, ln, d: 0, tag: refs.tags[i] };
    });
    const RJ: (typeof R)[number][] = [];
    R.forEach((z, i) => { if (S[i].sel) RJ[S[i].j] = z; });
    const bm = (w: number, h: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x4f6bff, transparent: true, opacity: 0 })); scene.add(m); return m; };
    const bh = bm(2.1, 0.05), bv = bm(0.05, 2);

    // recruiter screen + checks
    const scr = new THREE.Group();
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    scr.add(sm, new THREE.LineSegments(new THREE.EdgesGeometry(sm.geometry), new THREE.LineBasicMaterial({ color: 0x8b9cff })));
    scene.add(scr);
    const ckT = (() => {
      const k = document.createElement("canvas"); k.width = k.height = 64;
      const g = k.getContext("2d")!;
      g.fillStyle = "#12a574"; g.beginPath(); g.arc(32, 32, 30, 0, 6.3); g.fill();
      g.fillStyle = "#fff"; g.font = "700 40px system-ui"; g.textAlign = "center"; g.fillText("✓", 32, 45);
      return new THREE.CanvasTexture(k);
    })();
    const CK = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ckT, transparent: true, opacity: 0 }));
      s.scale.set(0.3, 0.3, 1); scene.add(s); return s;
    });

    // layout
    let W = 1, H = 1, sx = 1, cm = 1, cs = 1, RX = 6.2;
    const BP: THREE.Vector3[] = [], LP: THREE.Vector3[] = [], TP: THREE.Vector3[] = [], FP = new V(0, 1.55, 3.6);
    function lay() {
      W = st.clientWidth; H = st.clientHeight;
      RD.setSize(W, H, false);
      cam.aspect = W / H; cam.updateProjectionMatrix();
      const a = W / H;
      sx = a < 0.75 ? 0.42 : a < 1.2 ? 0.7 : 1;
      cm = a < 0.75 ? 1.95 : a < 1.2 ? 1.35 : 1;
      cs = sx < 0.8 ? 0.62 : 1;
      RX = 6.2 * sx;
      const sp = 1.15 * Math.max(0.62, sx), ts = 1.35 * Math.max(0.55, sx);
      for (let i = 0; i < 6; i++) { const u = (i - 2.5) / 2.5; BP[i] = new V(-(6.4 - 1.2 * u * u + (i % 2) * 0.9) * sx, 0, u * 2.4); LP[i] = new V((i - 2.5) * sp, 0.65, 3.2); }
      for (let i = 0; i < 3; i++) TP[i] = new V(RX + (i - 1) * ts, 2.95, 0.8);
    }
    lay();
    window.addEventListener("resize", lay);

    const KF = [[0, 0, 1.9, 13.5, 0, 1.3, 0], [0.2, 0, 1.9, 12.5, 0, 1.3, 0], [0.3, -1.2, 2.1, 11.5, -1.2, 1.2, 0.5], [0.4, 0, 1.8, 9, 0, 1.3, 1.5], [0.54, 0, 2.4, 10, 0, 1, 1.5], [0.7, 0, 2.3, 10.8, 0, 1, 1.5], [0.8, 1.6, 2.2, 10.8, 1.8, 1.4, 0], [0.9, 2.4, 2, 10.5, 2.4, 1.2, 0], [1, 2.2, 1.9, 10.5, 2.2, -0.1, 0]];
    function camAt(P: number): number[] {
      let i = 0;
      while (i < KF.length - 2 && P > KF[i + 1][0]) i++;
      const a = KF[i], b = KF[i + 1], t = ez(cl((P - a[0]) / (b[0] - a[0])));
      return a.map((v, k) => v + (b[k] - v) * t);
    }
    function bz(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, o: THREE.Vector3) {
      const u = 1 - t;
      o.set(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z);
    }
    const tmp = new V(), fr = new V(), md = new V(), cp = new V(0, 1.9, 13.5), lk = new V(0, 1.3, 0);
    let ps = 0, T = 0, mx = 0, my = 0, rafId = 0;
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2();
    const onDblClick = (e: MouseEvent) => {
      if (!refs.onOpenPipeline) return;
      const rect = RD.domElement.getBoundingClientRect();
      mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2D, cam);
      const hits = raycaster.intersectObjects([glass, shell, core, ...rg.children], true);
      // Also allow clicking if close to AI center in screen space
      const screenAi = new THREE.Vector3().copy(ai.position).project(cam);
      const sxPos = (screenAi.x * 0.5 + 0.5) * rect.width + rect.left;
      const syPos = (-screenAi.y * 0.5 + 0.5) * rect.height + rect.top;
      const dist = Math.hypot(e.clientX - sxPos, e.clientY - syPos);
      if (hits.length > 0 || dist < 120) {
        refs.onOpenPipeline();
      }
    };
    RD.domElement.addEventListener("dblclick", onDblClick);

    const onPointerCheck = (e: MouseEvent) => {
      const rect = RD.domElement.getBoundingClientRect();
      const screenAi = new THREE.Vector3().copy(ai.position).project(cam);
      const sxPos = (screenAi.x * 0.5 + 0.5) * rect.width + rect.left;
      const syPos = (-screenAi.y * 0.5 + 0.5) * rect.height + rect.top;
      const dist = Math.hypot(e.clientX - sxPos, e.clientY - syPos);
      if (dist < 120 && ai.visible) {
        RD.domElement.style.cursor = "pointer";
      } else {
        RD.domElement.style.cursor = "default";
      }
    };
    RD.domElement.addEventListener("mousemove", onPointerCheck);

    function pj(el: HTMLElement, v: THREE.Vector3, below: number, o: number) {
      tmp.copy(v).project(cam);
      el.style.opacity = String(o);
      if (o <= 0.01) return;
      el.style.transform = "translate(" + (tmp.x * 0.5 + 0.5) * W + "px," + (-tmp.y * 0.5 + 0.5) * H + "px) translate(-50%," + (below ? "6px" : "-100%") + ")";
    }
    const CAPS: [number, number, string, string][] = [[0, 0.2, "RECRUIT AI", "From hundreds of resumes to evidence-backed candidates."], [0.38, 0.64, "Analyzing candidate evidence…", ""], [0.66, 0.84, "Evidence-backed candidates identified.", ""]];
    const h1 = $("#cap h1"), cpp = $("#cap p"), capEl = $("#cap"), hint = $("#hint");
    let capI = -2;
    // Pre-populate RECRUIT AI instantly
    h1.className = "big";
    h1.innerHTML = [
      '<span class="char-span char-l">R</span>',
      '<span class="char-span char-l">E</span>',
      '<span class="char-span char-l">C</span>',
      '<span class="center-r">R</span>',
      '<span class="char-span char-r-side">U</span>',
      '<span class="char-span char-r-side">I</span>',
      '<span class="char-span char-r-side">T</span>',
      '<span class="char-span">&nbsp;</span>',
      '<span class="char-span char-r-side">A</span>',
      '<span class="char-span char-r-side">I</span>'
    ].join("");
    cpp.textContent = CAPS[0][3];
    capEl.style.transform = "translateY(calc(50vh - 50%))";
    capEl.style.opacity = "1";

    const scan = $("#scan"), lis = Array.from(scan.querySelectorAll<HTMLElement>("li"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("#dots i"));
    const fin = $("#fin"), fcs = Array.from(root.querySelectorAll<HTMLElement>(".fc")), bye = $("#bye");
    const DT = [0, 0.2, 0.38, 0.52, 0.64, 0.76, 0.9];

    function frame() {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) return;
      const rc = sc.getBoundingClientRect();
      const P0 = cl(-rc.top / (rc.height - window.innerHeight));
      ps += (P0 - ps) * 0.1;
      const P = ps;
      T += 0.016;
      // Candidates and AI orb emerge into view as you pass through the letter 'R'
      const ar = ez(sg(P, 0.84, 0.9)), er = ez(sg(P, 0.12, 0.24)), ea = ez(sg(P, 0.13, 0.25));
      const act = 0.25 * sg(P, 0.22, 0.38) + 0.75 * sg(P, 0.38, 0.42) * (1 - sg(P, 0.66, 0.72));
      const f1 = ez(sg(P, 0.4, 0.43)) * (1 - sg(P, 0.5, 0.54));
      S.forEach((s, i) => {
        const e = ez(sg(P, 0.12 + i * 0.015, 0.24 + i * 0.015));
        s.e = e;
        s.g.position.set(BP[i].x - (1 - e) * 8 * sx, 0, BP[i].z);
        s.g.scale.setScalar(0.85 + 0.15 * e);
        fade(s.ms, e);
        tmp.set(BP[i].x, 2.15, BP[i].z);
        pj(s.lab, tmp, 0, e);
      });
      rec.position.set(RX + (1 - er) * 8 * sx, 0, -0.2);
      rec.scale.setScalar((0.85 + 0.15 * er) * (1 + 0.04 * Math.sin(ar * Math.PI)));
      fade(recMs, er);
      tmp.set(RX, 0, 1.5); pj(recLab, tmp, 1, er);
      ai.visible = ea > 0.01;
      ai.scale.setScalar((0.4 + 0.6 * ea) * (1 + 0.05 * act * Math.sin(T * 6)));
      fade(AIm, ea);
      glass.material.emissiveIntensity = 0.3 + 0.5 * act;
      ai.rotation.y += (mx * 0.9 - ai.rotation.y) * 0.08;
      ai.rotation.x += (-my * 0.7 - ai.rotation.x) * 0.08;
      shell.rotation.y = T * 0.3; shell.rotation.x = T * 0.15;
      rg.rotation.y = T * (0.4 + act * 1.2); rg.rotation.z = T * 0.2;
      pts.rotation.y = T * 0.08; pts.rotation.x = 0;
      tmp.set(0, -0.1, 1.2); pj(aiLab, tmp, 1, ea * 0.9);
      R.forEach((z, i) => {
        const s = S[i], a = ez(sg(P, 0.2 + i * 0.02, 0.3 + i * 0.02)), L = LP[i];
        fr.set(s.g.position.x + 0.5, 0.95, s.g.position.z + 0.35);
        md.copy(fr).add(L).multiplyScalar(0.5); md.y += 2.4; md.z += 0.5;
        bz(fr, md, L, a, z.g.position);
        let k = (0.45 + 0.55 * a) * cs, op = s.e;
        const p = z.g.position;
        if (i === 0) { var f = ez(sg(P, 0.38, 0.42)) - ez(sg(P, 0.5, 0.54)); p.lerp(FP, f); k += f * 1.15 * cs; }
        const v = ez(sg(P, 0.66, 0.74));
        if (s.sel) {
          p.y += 0.35 * v; k *= 1 + 0.1 * v;
          const d = ez(sg(P, 0.76 + s.j * 0.03, 0.88 + s.j * 0.03));
          z.d = d;
          if (d > 0) { fr.copy(p); md.copy(fr).add(TP[s.j]).multiplyScalar(0.5); md.y += 2.6; bz(fr, md, TP[s.j], d, p); k *= 1 - 0.3 * d; }
        } else {
          p.y -= 0.5 * v; p.z -= 0.7 * v; p.x += (i < 3 ? -0.3 : 0.3) * v; k *= 1 - 0.15 * v; op *= 1 - 0.55 * v;
        }
        if (!s.sel) op *= 1 - sg(P, 0.93, 0.97);
        z.g.scale.setScalar(k);
        z.c.material.opacity = op; z.f.material.opacity = op;
        z.f.material.color.copy(CN).lerp(s.sel ? CG : CX, v);
        const la = z.ln.geometry.attributes.position;
        la.setXYZ(1, p.x, p.y, p.z); la.needsUpdate = true;
        z.ln.material.opacity = Math.max(i === 0 ? f1 : 0, ez(sg(P, 0.54, 0.6)) * (1 - sg(P, 0.66, 0.72))) * 0.5 * ea;
        tmp.set(p.x, p.y + 0.8 * k, p.z);
        pj(z.tag, tmp, 0, v * (s.sel ? 1 - z.d : 1) * (s.sel ? 1 : 1 - sg(P, 0.93, 0.97)));
      });
      bh.position.set(FP.x, FP.y + 1.3 - 2.6 * sg(P, 0.43, 0.5), FP.z + 0.02);
      bh.scale.x = cs; bh.material.opacity = Math.sin(sg(P, 0.42, 0.51) * Math.PI) * 0.85;
      bv.position.set(LP[0].x - 0.6 + sg(P, 0.54, 0.62) * (LP[5].x - LP[0].x + 1.2), 0.7, 3.3);
      bv.material.opacity = Math.sin(sg(P, 0.54, 0.62) * Math.PI) * 0.8;
      scr.position.set(RX, 2.95, 0.5);
      scr.scale.set(Math.max(0.55, sx), Math.max(0.01, ar), 1);
      scr.visible = ar > 0.01;
      CK.forEach((c, j) => {
        c.position.set(TP[j].x + 0.45 * cs, TP[j].y + 0.55, 1.2);
        c.material.opacity = sg(RJ[j].d, 0.9, 1);
      });
      // overlays
      const so = ez(sg(P, 0.4, 0.43)) * (1 - sg(P, 0.52, 0.55));
      scan.style.opacity = String(so); scan.style.visibility = so > 0.01 ? "visible" : "hidden";
      const n = Math.floor(sg(P, 0.44, 0.5) * 7.99);
      lis.forEach((li, k) => { li.classList.toggle("on", k < n); });
      let ci = -1;
      CAPS.forEach((c, k) => { if (P >= c[0] && P < c[1]) ci = k; });
      if (ci !== capI) {
        capI = ci;
        if (ci === 0) {
          // Break RECRUIT AI into spans so we can zoom through the center 'R'
          // Letters: R, E, C, R(center), U, I, T, [space], A, I
          h1.className = "big";
          h1.innerHTML = [
            '<span class="char-span char-l">R</span>',
            '<span class="char-span char-l">E</span>',
            '<span class="char-span char-l">C</span>',
            '<span class="center-r">R</span>',
            '<span class="char-span char-r-side">U</span>',
            '<span class="char-span char-r-side">I</span>',
            '<span class="char-span char-r-side">T</span>',
            '<span class="char-span">&nbsp;</span>',
            '<span class="char-span char-r-side">A</span>',
            '<span class="char-span char-r-side">I</span>'
          ].join("");
          cpp.textContent = CAPS[0][3];
        } else if (ci > 0) {
          h1.className = "norm";
          h1.textContent = CAPS[ci][2];
          cpp.textContent = CAPS[ci][3];
        }
      }

      // Starting page zoom animation: zoom ALL text at the exact same speed and size, entering through center 'R'
      if (P < 0.22) {
        // zProgress goes 0 -> 1 as user scrolls from 0 to 0.16
        const zP = ez(sg(P, 0, 0.16));
        // Subtitle fades out quickly
        cpp.style.opacity = String(1 - sg(P, 0, 0.05));
        cpp.style.transform = `translateY(${zP * -25}px)`;

        // Uniform scale for ALL text together
        const fullScale = 1 + zP * zP * 70;

        // Position transform-origin directly on the center 'R'
        const centerREl = h1.querySelector<HTMLElement>(".center-r");
        if (centerREl) {
          const h1Rect = h1.getBoundingClientRect();
          const rRect = centerREl.getBoundingClientRect();
          if (h1Rect.width > 0) {
            const originX = ((rRect.left + rRect.width * 0.5 - h1Rect.left) / h1Rect.width) * 100;
            const originY = ((rRect.top + rRect.height * 0.55 - h1Rect.top) / h1Rect.height) * 100;
            h1.style.transformOrigin = `${originX.toFixed(1)}% ${originY.toFixed(1)}%`;
          }
        }

        h1.style.transform = `scale(${fullScale})`;

        // As you plunge through the center R, text cleanly dissolves as the 3D scene opens
        const textOpacity = 1 - sg(P, 0.10, 0.17);
        h1.style.opacity = String(Math.max(0, textOpacity));

        // Center vertically on start, keep centered during zoom-through
        capEl.style.transform = `translateY(calc(50vh - 50%))`;
        capEl.style.opacity = "1";
      } else {
        // Subsequent sections (ci > 0)
        cpp.style.opacity = "1";
        cpp.style.transform = "none";
        h1.style.transform = "none";
        h1.style.opacity = "1";
        const topOffset = 26;
        capEl.style.transform = `translateY(${topOffset}px)`;
        const co = ci < 0 ? 0 : Math.min(sg(P, CAPS[ci][0], CAPS[ci][0] + 0.03) + 1, 1 - sg(P, CAPS[ci][1] - 0.03, CAPS[ci][1]));
        capEl.style.opacity = String(co);
      }
      let di = 0;
      DT.forEach((t, k) => { if (P >= t) di = k; });
      dots.forEach((d, k) => { d.classList.toggle("on", k <= di); });
      hint.style.opacity = String(1 - sg(P, 0, 0.04));
      fin.style.opacity = String(sg(P, 0.9, 0.93));
      fcs.forEach((c, j) => {
        const q = ez(sg(P, 0.91 + j * 0.02, 0.97 + j * 0.02));
        c.style.opacity = String(q);
        c.style.transform = "translateY(" + (1 - q) * 40 + "px) rotateX(" + (1 - q) * 20 + "deg)";
      });
      bye.style.opacity = String(sg(P, 0.98, 1));
      // camera
      const c = camAt(P);
      tmp.set(c[1] * sx + mx * 0.6, c[2] - my * 0.4, c[6] + (c[3] - c[6]) * cm);
      cp.lerp(tmp, 0.12);
      tmp.set(c[4] * sx, c[5], c[6]);
      lk.lerp(tmp, 0.12);
      cam.position.copy(cp); cam.lookAt(lk);
      RD.render(scene, cam);
    }
    frame();


    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", lay);
      window.removeEventListener("pointermove", onMove);
      RD.domElement.removeEventListener("dblclick", onDblClick);
      RD.domElement.removeEventListener("mousemove", onPointerCheck);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) ([] as THREE.Material[]).concat(m.material).forEach((x) => {
          const mm = x as THREE.MeshBasicMaterial;
          if (mm.map) mm.map.dispose();
          x.dispose();
        });
      });
      RD.dispose();
      if (RD.domElement.parentNode) RD.domElement.parentNode.removeChild(RD.domElement);
    };
}
