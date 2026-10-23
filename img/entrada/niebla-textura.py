"""Textura de niebla para el respaldo sin WebGL de la portada (agente Entrada).

Ruido 1/f filtrado en frecuencia (por eso se repite sin costura), blanco con el alfa del ruido.
Escribe img/entrada/niebla-a.webp (bancos anchos) y img/entrada/niebla-b.webp (jirones finos).
Uso: python -I img/entrada/niebla-textura.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent


def ruido(n, beta, semilla, estirar=1.0):
    rng = np.random.default_rng(semilla)
    blanco = rng.normal(size=(n, n))
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :] * estirar      # estirar > 1: bancos más anchos que altos
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1
    espectro = np.fft.fft2(blanco) / f ** beta
    espectro[0, 0] = 0
    r = np.real(np.fft.ifft2(espectro))
    r = (r - r.min()) / (r.max() - r.min())
    return r


def guardar(nombre, n, beta, semilla, estirar, corte, tope, calidad):
    r = ruido(n, beta, semilla, estirar)
    a = np.clip((r - corte) / (1 - corte), 0, 1) ** 1.3 * tope
    rgba = np.zeros((n, n, 4), np.uint8)
    rgba[..., 0] = 244
    rgba[..., 1] = 246
    rgba[..., 2] = 246
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(AQUI / nombre, 'WEBP', quality=calidad, method=6)
    print(nombre, (AQUI / nombre).stat().st_size, 'bytes')


guardar('niebla-a.webp', 384, 2.0, 45, 2.4, 0.28, 0.95, 72)
guardar('niebla-b.webp', 256, 1.7, 48, 1.8, 0.40, 0.85, 72)
