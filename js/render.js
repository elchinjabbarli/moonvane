import { bearing, mothSatisfied } from "./engine.js";
const COL = ["#ffcf6b", "#ff8fb1", "#b79cff"];
const COLdark = ["#c98f2e", "#c05a7e", "#7a5fc0"];
const PAL = [["#2b3a6b", "#0e1430"], ["#234a52", "#0c1a22"], ["#4a3550", "#160f22"], ["#523247", "#1a0f1c"], ["#38356b", "#100e28"], ["#234a48", "#0a1a1c"], ["#524033", "#1a100c"], ["#2f3d5e", "#0c1226"], ["#372f56", "#0e0a20"], ["#234a6b", "#081626"]];
export class Renderer {
    constructor(canvas) {
        this.dpr = 1;
        this.W = 0;
        this.H = 0;
        this.cell = 0;
        this.ox = 0;
        this.oy = 0;
        this.angles = [];
        this.particles = [];
        this.rings = [];
        this.stars = [];
        this.flies = [];
        this.prevSat = [];
        this.shake = 0;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        for (let i = 0; i < 90; i++)
            this.stars.push({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.5 + 0.3, p: Math.random() * 6.28 });
        for (let i = 0; i < 14; i++)
            this.flies.push({ x: Math.random(), y: 0.3 + Math.random() * 0.6, p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8 });
        this.resize();
    }
    resize() { this.dpr = Math.min(window.devicePixelRatio || 1, 2.5); const r = this.canvas.getBoundingClientRect(); this.canvas.width = Math.max(1, Math.round(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.round(r.height * this.dpr)); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.W = r.width; this.H = r.height; }
    layout(size) { const pad = Math.min(this.W, this.H) * 0.06; this.cell = Math.min((this.W - 2 * pad) / size, (this.H - 2 * pad) / size); this.ox = (this.W - this.cell * size) / 2; this.oy = (this.H - this.cell * size) / 2; }
    cellAt(px, py, size) { this.layout(size); const x = Math.floor((px - this.ox) / this.cell), y = Math.floor((py - this.oy) / this.cell); if (x < 0 || y < 0 || x >= size || y >= size)
        return null; return { x, y }; }
    cx(x) { return this.ox + (x + 0.5) * this.cell; }
    cy(y) { return this.oy + (y + 0.5) * this.cell; }
    burst(x, y, color, n = 14) { if (this.particles.length > 260)
        return; const px = this.cx(x), py = this.cy(y); for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = 30 + Math.random() * 130;
        this.particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0, max: 0.5 + Math.random() * 0.6, color, size: 1.5 + Math.random() * 3, grav: 90 });
    } }
    lockRing(x, y, color) { this.rings.push({ x: this.cx(x), y: this.cy(y), life: 0, color }); }
    frame(s, dt) {
        const ctx = this.ctx;
        this.layout(s.level.size);
        const n = s.level.size;
        const pal = PAL[s.level.chapter % PAL.length];
        const rm = !!s.reduceMotion;
        const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
        const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
        this.shake = Math.max(0, this.shake - dt * 30);
        ctx.save();
        ctx.translate(sx, sy);
        const g = ctx.createLinearGradient(0, 0, 0, this.H);
        g.addColorStop(0, pal[0]);
        g.addColorStop(1, pal[1]);
        ctx.fillStyle = g;
        ctx.fillRect(-8, -8, this.W + 16, this.H + 16);
        const nb = ctx.createRadialGradient(this.W * 0.7, this.H * 0.2, 0, this.W * 0.7, this.H * 0.2, this.W * 0.5);
        nb.addColorStop(0, COL[s.level.chapter % 3] + "22");
        nb.addColorStop(1, "#00000000");
        ctx.fillStyle = nb;
        ctx.fillRect(0, 0, this.W, this.H);
        for (const st of this.stars) {
            const tw = rm ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(s.time * 0.9 + st.p));
            ctx.globalAlpha = tw * 0.8;
            ctx.fillStyle = "#e6edff";
            ctx.beginPath();
            ctx.arc(st.x * this.W, st.y * this.H, st.r, 0, 6.28);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.moveTo(0, this.H);
        const hh = this.H * 0.12;
        for (let x = 0; x <= this.W; x += 8) {
            ctx.lineTo(x, this.H - hh * (0.6 + 0.4 * Math.sin(x * 0.02 + s.level.chapter)));
        }
        ctx.lineTo(this.W, this.H);
        ctx.closePath();
        ctx.fill();
        if (!rm)
            for (const f of this.flies) {
                const fx = (f.x + Math.sin(s.time * 0.3 * f.s + f.p) * 0.03) * this.W;
                const fy = (f.y + Math.cos(s.time * 0.25 * f.s + f.p) * 0.03) * this.H;
                const a = 0.3 + 0.5 * Math.abs(Math.sin(s.time * f.s + f.p));
                ctx.globalAlpha = a;
                ctx.fillStyle = "#ffe9a8";
                ctx.beginPath();
                ctx.arc(fx, fy, 1.6, 0, 6.28);
                ctx.fill();
            }
        ctx.globalAlpha = 1;
        const objs = s.level.fixed.concat(s.placed);
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
                const px = this.ox + x * this.cell, py = this.oy + y * this.cell;
                ctx.fillStyle = "rgba(255,255,255,0.028)";
                this.rr(px + 2, py + 2, this.cell - 4, this.cell - 4, this.cell * 0.16);
                ctx.fill();
            }
        for (const b of s.level.blocked) {
            const x = b % n, y = Math.floor(b / n);
            this.drawCloud(this.cx(x), this.cy(y), s.time, rm);
        }
        for (const m of s.level.moths)
            this.drawGhost(m.x, m.y, m.dx, m.dy, COL[m.c], s.time, rm);
        for (const o of objs) {
            if (o.k === 0)
                this.drawMoon(this.cx(o.x), this.cy(o.y), o.c, !!o.fixed, s.cb, s.time, rm);
            else
                this.drawBat(this.cx(o.x), this.cy(o.y), o.c, s.cb, s.time, rm);
        }
        if (this.angles.length !== s.level.moths.length) {
            this.angles = s.level.moths.map(m => Math.atan2(m.dy, m.dx));
            this.prevSat = s.level.moths.map(() => false);
        }
        const cel = s.celebrate || 0;
        for (let i = 0; i < s.level.moths.length; i++) {
            const m = s.level.moths[i];
            const b = bearing(m.x, m.y, m.c, objs);
            const sat = mothSatisfied(m, objs);
            if (sat && !this.prevSat[i] && !rm) {
                this.lockRing(m.x, m.y, COL[m.c]);
                this.burst(m.x, m.y, COL[m.c], 6);
            }
            this.prevSat[i] = sat;
            if (!b || b === "tie") {
                this.angles[i] += dt * (rm ? 0.8 : 3.0);
            }
            else {
                const target = Math.atan2(b.dy, b.dx);
                let d = target - this.angles[i];
                while (d > Math.PI)
                    d -= 6.283;
                while (d < -Math.PI)
                    d += 6.283;
                this.angles[i] += d * Math.min(1, dt * 11);
            }
            const lift = cel > 0 ? -Math.sin(cel * Math.PI) * this.cell * 0.4 : 0;
            this.drawMoth(this.cx(m.x), this.cy(m.y) + lift, this.angles[i], m.c, sat, (!b || b === "tie"), s.cb, s.time, rm, cel);
        }
        if (s.hint && s.hintT > 0) {
            const px = this.cx(s.hint.x), py = this.cy(s.hint.y);
            const pr = this.cell * (0.42 + 0.1 * Math.sin(s.time * 6));
            ctx.strokeStyle = "rgba(255,255,255," + Math.min(1, s.hintT) + ")";
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.arc(px, py, pr, s.time * 2, s.time * 2 + 6.28);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.life += dt;
            if (r.life > 0.6) {
                this.rings.splice(i, 1);
                continue;
            }
            const k = r.life / 0.6;
            ctx.globalAlpha = (1 - k) * 0.9;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 3 * (1 - k) + 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, this.cell * (0.3 + k * 0.7), 0, 6.28);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.max) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.grav * dt;
            ctx.globalAlpha = 1 - p.life / p.max;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life / p.max * 0.5), 0, 6.28);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    rr(x, y, w, h, r) { const ctx = this.ctx; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    drawGhost(x, y, dx, dy, color, time, rm) {
        const ctx = this.ctx;
        const px = this.cx(x), py = this.cy(y);
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const L = this.cell * 1.12;
        const pulse = rm ? 0.3 : 0.22 + 0.1 * Math.sin(time * 2.4);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = rm ? 0 : -time * 14;
        ctx.beginPath();
        ctx.moveTo(px + ux * this.cell * 0.34, py + uy * this.cell * 0.34);
        ctx.lineTo(px + ux * L, py + uy * L);
        ctx.stroke();
        ctx.setLineDash([]);
        const hx = px + ux * L, hy = py + uy * L;
        const ah = this.cell * 0.17;
        ctx.globalAlpha = pulse + 0.15;
        ctx.beginPath();
        ctx.moveTo(hx + ux * ah * 0.4, hy + uy * ah * 0.4);
        ctx.lineTo(hx - ux * ah - uy * ah * 0.62, hy - uy * ah + ux * ah * 0.62);
        ctx.lineTo(hx - ux * ah + uy * ah * 0.62, hy - uy * ah - ux * ah * 0.62);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }
    drawCloud(px, py, time, rm) { const ctx = this.ctx; const r = this.cell * 0.32; const dx = rm ? 0 : Math.sin(time * 0.8 + px) * 1.5; ctx.save(); ctx.translate(px + dx, py); ctx.globalAlpha = 0.55; ctx.fillStyle = "#93a7cc"; for (const [ox, oy, rr] of [[-0.24, 0.06, 0.72], [0.2, 0.02, 0.88], [0.0, -0.14, 0.62], [0.06, 0.14, 0.7]]) {
        ctx.beginPath();
        ctx.arc(ox * this.cell, oy * this.cell, r * rr, 0, 6.28);
        ctx.fill();
    } ctx.globalAlpha = 0.25; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-0.05 * this.cell, -0.12 * this.cell, r * 0.5, 0, 6.28); ctx.fill(); ctx.restore(); }
    drawMoon(px, py, c, fixed, cb, time, rm) {
        const ctx = this.ctx;
        const r = this.cell * 0.3;
        const col = COL[c];
        const halo = rm ? 1 : 1 + 0.06 * Math.sin(time * 2 + px);
        const gl = ctx.createRadialGradient(px, py, r * 0.2, px, py, r * 2.3 * halo);
        gl.addColorStop(0, col + "bb");
        gl.addColorStop(0.6, col + "33");
        gl.addColorStop(1, col + "00");
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.3 * halo, 0, 6.28);
        ctx.fill();
        const sp = ctx.createRadialGradient(px - r * 0.35, py - r * 0.35, r * 0.1, px, py, r);
        sp.addColorStop(0, "#fff7e0");
        sp.addColorStop(0.45, col);
        sp.addColorStop(1, COLdark[c]);
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.14)";
        for (const [ox, oy, rr] of [[0.3, 0.15, 0.2], [-0.15, 0.35, 0.14], [0.1, -0.3, 0.12]]) {
            ctx.beginPath();
            ctx.arc(px + ox * r, py + oy * r, r * rr, 0, 6.28);
            ctx.fill();
        }
        if (!rm) {
            const a = time * 1.6 + px;
            const ox = px + Math.cos(a) * r * 1.5, oy = py + Math.sin(a) * r * 1.5;
            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(ox, oy, 1.6, 0, 6.28);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (fixed) {
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(px, py, r + 4, 0, 6.28);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (cb)
            this.symbol(px, py, c, r * 0.42);
    }
    drawBat(px, py, c, cb, time, rm) {
        const ctx = this.ctx;
        const r = this.cell * 0.3;
        const col = COL[c];
        const flap = rm ? 0 : Math.sin(time * 7 + px) * 0.28;
        ctx.save();
        ctx.translate(px, py);
        const gl = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.8);
        gl.addColorStop(0, col + "55");
        gl.addColorStop(1, col + "00");
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = "#241c2e";
        for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.1);
            ctx.quadraticCurveTo(sgn * r * 1.1, -r * (0.9 + flap), sgn * r * 1.9, -r * (0.1 - flap * 0.5));
            ctx.quadraticCurveTo(sgn * r * 1.5, r * 0.15, sgn * r * 1.1, r * 0.05);
            ctx.quadraticCurveTo(sgn * r * 0.8, r * 0.3, sgn * r * 0.4, r * 0.15);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "#2e2438";
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.42, r * 0.55, 0, 0, 6.28);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.4);
        ctx.lineTo(-r * 0.42, -r * 0.75);
        ctx.lineTo(-r * 0.12, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.3, -r * 0.4);
        ctx.lineTo(r * 0.42, -r * 0.75);
        ctx.lineTo(r * 0.12, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(-r * 0.15, -r * 0.12, r * 0.09, 0, 6.28);
        ctx.arc(r * 0.15, -r * 0.12, r * 0.09, 0, 6.28);
        ctx.fill();
        ctx.restore();
        if (cb)
            this.symbol(px, py + r * 0.7, c, r * 0.34);
    }
    drawMoth(px, py, angle, c, sat, confused, cb, time, rm, cel) {
        const ctx = this.ctx;
        const r = this.cell * 0.3;
        const col = COL[c];
        const flap = rm ? 0.3 : (Math.sin(time * (sat ? 11 : 6) + px) * 0.5 + 0.5);
        const wingY = 0.55 + flap * 0.45;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + (confused && !rm ? Math.sin(time * 9) * 0.12 : 0));
        if (sat) {
            const gl = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.6);
            gl.addColorStop(0, col + "77");
            gl.addColorStop(1, col + "00");
            ctx.fillStyle = gl;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2.6, 0, 6.28);
            ctx.fill();
        }
        const body = confused ? "#8b93a8" : "#4a3a2c";
        ctx.fillStyle = confused ? "#9aa3b8" : COLdark[c];
        ctx.globalAlpha = 0.9;
        for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(-r * 0.35, sgn * r * 0.5 * wingY, r * 0.62, r * 0.42 * wingY, sgn * 0.5, 0, 6.28);
            ctx.fill();
        }
        const wg = ctx.createLinearGradient(-r, -r, r * 0.4, r);
        wg.addColorStop(0, confused ? "#aab2c4" : col);
        wg.addColorStop(1, confused ? "#8b93a8" : COLdark[c]);
        ctx.fillStyle = wg;
        ctx.globalAlpha = sat ? 1 : 0.92;
        for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(-r * 0.1, sgn * r * 0.62 * wingY, r * 0.95, r * 0.55 * wingY, sgn * -0.35, 0, 6.28);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!confused) {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            for (const sgn of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(-r * 0.25, sgn * r * 0.6 * wingY, r * 0.14, 0, 6.28);
                ctx.fill();
            }
            ctx.fillStyle = "rgba(20,15,30,0.55)";
            for (const sgn of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(-r * 0.25, sgn * r * 0.6 * wingY, r * 0.07, 0, 6.28);
                ctx.fill();
            }
        }
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(r * 0.05, 0, r * 0.62, r * 0.26, 0, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = confused ? "#a5adc0" : "#6b563f";
        ctx.beginPath();
        ctx.ellipse(r * 0.3, 0, r * 0.3, r * 0.2, 0, 0, 6.28);
        ctx.fill();
        ctx.strokeStyle = body;
        ctx.lineWidth = Math.max(1, r * 0.07);
        ctx.lineCap = "round";
        for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(r * 0.5, sgn * r * 0.08);
            ctx.quadraticCurveTo(r * 0.95, sgn * r * 0.4, r * 1.15, sgn * r * 0.55);
            ctx.stroke();
        }
        ctx.fillStyle = sat ? "#fff6d8" : "#e8dcc0";
        ctx.beginPath();
        ctx.arc(r * 0.62, 0, r * 0.2, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = sat ? "#2a2416" : "#5a4a36";
        ctx.beginPath();
        ctx.arc(r * 0.68, -r * 0.07, r * 0.055, 0, 6.28);
        ctx.arc(r * 0.68, r * 0.07, r * 0.055, 0, 6.28);
        ctx.fill();
        ctx.restore();
        if (cb)
            this.symbol(px, py - this.cell * 0.36, c, r * 0.3);
        if (confused && !cb) {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font = "bold " + Math.round(r * 0.7) + "px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("?", px, py - this.cell * 0.34);
        }
    }
    symbol(px, py, c, r) { const ctx = this.ctx; ctx.save(); ctx.fillStyle = "#0d1226"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); if (c === 0)
        ctx.arc(px, py, r, 0, 6.28);
    else if (c === 1) {
        ctx.moveTo(px, py - r);
        ctx.lineTo(px + r, py + r);
        ctx.lineTo(px - r, py + r);
        ctx.closePath();
    }
    else {
        ctx.rect(px - r, py - r, r * 2, r * 2);
    } ctx.fill(); ctx.stroke(); ctx.restore(); }
}
