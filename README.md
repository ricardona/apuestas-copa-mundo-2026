# ⚽ Polla Mundialista

Aplicación web para llevar el registro de pronósticos, posiciones y estadísticas durante el Mundial. Construida como SPA sobre **Cloudflare Workers + D1**, con autenticación vía [Clerk](https://clerk.com/).

## ✨ Características

- **Apuestas en línea:** Cada participante ingresa y edita sus pronósticos directamente desde la página web (pestaña **Mis Apuestas**), antes del pitazo inicial de cada partido. No se requiere conocimiento técnico.
- **Autenticación Segura:** Acceso protegido mediante [Clerk](https://clerk.com/), con lista de espera para nuevos participantes y soporte para inicio de sesión social.
- **Ranking en Tiempo Real:** Cálculo automático de puntos y actualización de la tabla de posiciones tras cada partido.
- **Pronósticos Plus:** Soporte para predicciones a largo plazo (convocatoria final de Colombia, posiciones exactas de grupos, equipos que avanzan en eliminatorias y el Top 4 del torneo).
- **Dashboard Estadístico:** Gráficas de rendimiento interactivo, tendencias y métricas divertidas para los jugadores (mejor racha, más exactos, especialista, etc.).
- **Diseño Responsivo:** Interfaz moderna y adaptable a dispositivos móviles.

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3 (Vanilla), TypeScript, [React](https://react.dev/) (capa de autenticación)
- **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/) — API REST con validación de JWT de Clerk
- **Base de Datos:** [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite en el edge; almacena jugadores y apuestas
- **Autenticación:** [Clerk](https://clerk.com/) para gestión de usuarios, lista de espera e inicio de sesión
- **Librerías:** [Chart.js](https://www.chartjs.org/) para visualización de datos
- **Herramientas de Construcción:** [Vite](https://vitejs.dev/)

## 🎮 Cómo Participar

1. **Solicitar acceso:** Entra a la página y registrate en la lista de espera.

2. **Esperar aprobación:** El administrador aprobará tu solicitud desde el dashboard de Clerk. Recibirás una notificación cuando estés habilitado.

3. **Iniciar sesión:** Una vez aprobado, ingresa con tu cuenta (Google, Facebook o GitHub).

4. **Ir a "Mis Apuestas":** Desde el menú principal, abre la pestaña **Mis Apuestas** y completa tus pronósticos:
   - **Partidos:** Marcador exacto para cada partido pendiente
   - **Convocatoria Colombia:** Selecciona los 26 jugadores que crees que irán al Mundial
   - **Top 4:** Campeón, subcampeón, tercer y cuarto puesto
   - **Posiciones de Grupo:** Orden final de cada grupo
   - **Eliminatorias:** Equipo que avanza en cada llave

5. **Guardar:** Presiona **Guardar apuestas**. Tus pronósticos quedan almacenados en Cloudflare D1.

6. **Editar cuando quieras:** Puedes volver a editar antes del inicio de cada partido. Los partidos ya disputados quedan bloqueados y sus pronósticos se preservan.

## 📊 Sistema de Puntuación

### Puntos por Partido
- **Marcador exacto:** 3 puntos.
- **Tendencia correcta:** 1 punto (acertar qué equipo gana o si hay empate, sin acertar los goles exactos).
- **Error:** 0 puntos.
- *Nota: Existen multiplicadores especiales de partido (x2, x3) configurables desde `data/settings.json`.*

### Puntos Plus
- **Convocatoria final de Colombia:** 1 punto por cada jugador acertado. Estos son los primeros puntos que computa el sistema y funcionan como puntaje base antes de partidos, grupos o eliminatorias. La lista oficial se carga en `data/colombia_final.json` bajo la clave `"jugadoresOficiales"`.
- **Top 4 del Torneo:** Campeón (8 pts), Subcampeón (5 pts), 3er Puesto (4 pts), 4to Puesto (3 pts).
- **Posición de Grupo:** 2 puntos por cada equipo ubicado en su posición final exacta.
- **Avanzan de fase:** 2 puntos por cada equipo que acertés que avanza en las llaves de eliminación directa.

### 🏆 Logros y Medallas (Dashboard de Estadísticas)

Para hacer la competencia más emocionante, el sistema calcula automáticamente las siguientes medallas y reconocimientos a lo largo del torneo:

- **🎯 El Vidente:** El participante con más marcadores exactos acertados.
- **🔥 Racha de Fuego:** El participante con la mayor racha de aciertos exactos de forma consecutiva.
- **🤑 El Apostador:** Quien ha conseguido la mayor cantidad de puntos en partidos especiales (con multiplicador).
- **🪵 El Tronco:** El participante con más partidos en los que obtuvo 0 puntos.
- **🔮 Nostradamus:** Quien ha sumado más puntos en la fase de pronósticos Plus (lista de convocados, grupos, llaves y top 4).
- **Maturana:** El participante que acertó la mayor cantidad de jugadores en la lista final de 26 convocados de Colombia.
- **🥅 El "Al Palo":** El participante que acertó más tendencias de juego (quién gana o si hay empate) pero sin dar en el marcador exacto.
- **🥱 El Conservador:** Quien apostó al empate más veces.
- **🐴 Caballo de Arranque:** El participante con mejor desempeño relativo en la fase de grupos en comparación con la fase de eliminación directa.
- **🐢 Tortuga Ninja:** El participante con mejor desempeño relativo en la fase de eliminación directa en comparación con la fase de grupos (el rey de las remontadas).
- **🎢 Montaña Rusa:** El participante más inconstante del torneo (con la mayor cantidad de transiciones entre sumar y no sumar puntos).
- **🐑 La Oveja Negra:** El participante que ha sumado la **menor cantidad de puntos** en los partidos.

## 🗄️ Base de Datos (Cloudflare D1)

El proyecto usa **Cloudflare D1** como base de datos principal. Almacena dos tablas:
- `players` — usuarios registrados (id de Clerk, username, email, avatar)
- `player_bets` — apuestas de cada jugador (partidos y pronósticos Plus)

### Aplicar el esquema

```bash
# En producción (D1 remoto)
npx wrangler d1 execute mundial2026db --file=sql/schema.sql --remote

# En desarrollo local
npx wrangler d1 execute mundial2026db --file=sql/schema.sql --local
```

### Modificar el esquema

Si necesitas cambiar la estructura de la tabla, edita `sql/schema.sql` y ejecuta el comando anterior. Para migraciones destructivas (e.g. renombrar columnas) usa `ALTER TABLE` directamente:

```bash
npx wrangler d1 execute mundial2026db --command="ALTER TABLE players ADD COLUMN nueva_columna TEXT"
```

### Variables de entorno requeridas (Cloudflare Workers)

| Variable            | Dónde configurar | Descripción                          |
|---------------------|------------------|--------------------------------------|
| `CLERK_SECRET_KEY`  | Dashboard de Cloudflare → Settings → Variables and Secrets | Clave secreta de Clerk (Backend API) — debe guardarse como **Secret** |
| `CLERK_PUBLISHABLE_KEY` | `wrangler.jsonc` (`vars`) | Clave pública de Clerk — ya incluida en el repositorio |

Solo `CLERK_SECRET_KEY` requiere configuración manual en el dashboard de Cloudflare; `CLERK_PUBLISHABLE_KEY` ya está definida en `wrangler.jsonc`.

---

## 🚀 Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone <url-del-repo>
   cd polla-futbolera
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo (solo frontend):
   ```bash
   npm run dev
   ```

4. Compila para producción:
   ```bash
   npm run build
   ```

5. Ejecuta el entorno completo localmente (Worker + assets):
   ```bash
   npm run build
   npx wrangler dev
   ```
   Abre http://localhost:8787. Las rutas `/api/*` son manejadas por el Worker y el resto sirve el SPA desde `dist/`.

   > **Nota:** Usa `npx wrangler dev` (no `wrangler pages dev`). El proyecto usa el modelo **Workers + Assets** de Cloudflare con un único punto de entrada en `functions/api/sync-user.ts`. El comando `wrangler pages dev` espera rutas basadas en archivos (Pages Functions) y lanzará un error de "No routes found".

---
*Hecho con pasión por el fútbol ⚽*
