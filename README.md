# Serpiente

El clásico juego de la serpiente en JavaScript puro con `canvas`. Sin librerías.

<!-- Añade aquí una captura: ![Captura de Serpiente](docs/captura.png) -->

**Demo:** https://christiiangv.github.io/serpiente/

## Controles

- Flechas o WASD para moverte
- Espacio, Enter o `P` para pausar y reanudar
- En el móvil: desliza el dedo sobre el tablero

## Detalles técnicos

- **Lógica separada del dibujo:** `js/game.js` no usa el DOM, por eso se puede probar con Node.
- **Cola de giros:** guarda hasta dos giros por paso, así que dos pulsaciones rápidas nunca hacen que la serpiente se dé la vuelta sobre sí misma.
- **Movimiento fluido:** cada segmento se interpola entre su posición anterior y la actual, sin depender de los fotogramas por segundo.
- **Rendimiento:** el fondo se dibuja una sola vez y se copia, el lienzo se adapta a pantallas de alta densidad y el bucle ignora los saltos de tiempo tras una pausa.
- **Dificultad progresiva:** la velocidad aumenta con los puntos hasta un máximo.
- Se pausa sola al cambiar de pestaña, guarda el récord en `localStorage` y respeta el modo claro, el oscuro y el de movimiento reducido.

## Estructura

```
index.html       Página
css/style.css    Estilos y colores del juego
js/game.js       Reglas del juego (sin DOM)
js/main.js       Dibujo, entrada y bucle del juego
test/            Pruebas automáticas
```

## Pruebas

Con Node 18 o superior:

```bash
node --test
```

## Cómo ejecutarlo

Abre `index.html` en el navegador.
