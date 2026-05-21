# ⚽ Polla Mundialista

Bienvenido al repositorio de la **Polla Mundialista**. Esta es una aplicación web interactiva y transparente basada en Git para llevar el registro de pronósticos, posiciones y estadísticas durante el Mundial.

## ✨ Características

- **Transparencia Total (GitOps):** Los pronósticos se registran mediante commits en este repositorio antes de los partidos. ¡Nadie puede cambiar sus apuestas "en secreto"!
- **Ranking en Tiempo Real:** Cálculo automático de puntos y actualización de la tabla de posiciones tras cada partido.
- **Pronósticos Plus:** Soporte para predicciones a largo plazo (convocatoria final de Colombia, posiciones exactas de grupos, equipos que avanzan en eliminatorias y el Top 4 del torneo).
- **Dashboard Estadístico:** Gráficas de rendimiento interactivo, tendencias y métricas divertidas para los jugadores (mejor racha, más exactos, especialista, etc.).
- **Diseño Responsivo:** Interfaz moderna y adaptable a dispositivos móviles.

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3 (Vanilla), TypeScript
- **Librerías:** [Chart.js](https://www.chartjs.org/) para visualización de datos
- **Herramientas de Construcción:** [Vite](https://vitejs.dev/)
- **Infraestructura:** GitHub Actions y flujos de despliegue automatizado.

## 🎮 Cómo Participar

Para unirte a la polla, necesitas acceso a este repositorio y seguir estos pasos:

1. **Registra tu nombre:**
   Edita el archivo `data/players.json` y agrega tu usuario al array `"participantes"`.
   ```json
   {
     "participantes": ["tu_usuario"]
   }
   ```

2. **Crea tu archivo de apuestas:**
   Crea `data/bets/tu_usuario.json` con tus marcadores exactos para cada partido.
   ```json
   [
     { "matchId": 1, "gL": 2, "gV": 1 },
     { "matchId": 2, "gL": 0, "gV": 0 }
   ]
   ```

3. **Pronósticos Plus (Opcional pero recomendado):**
   Crea `data/bets/tu_usuario.plus.json` con tus predicciones a largo plazo. **Importante: debes hacerlo antes de que inicie el torneo.**
   ```json
   {
     "posicionesGrupos": {
       "A": ["Brasil", "Argentina", "Uruguay", "Chile"]
     },
     "top4": {
       "campeon": "Brasil",
       "subcampeon": "Argentina",
       "tercero": "Francia",
       "cuarto": "España"
     },
     "goOn": [
       { "matchId": 49, "equipo": "Argentina" }
     ],
     "convocatoriaColombia": [
       "Jugador 1",
       "Jugador 2"
     ]
   }
   ```

4. **Haz commit y push:**
   Sube tus cambios al repositorio oficial **antes del pitazo inicial de los respectivos partidos**. El historial de Git (Timestamp) actúa como juez de transparencia.

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
- **🇨🇴 Convocatoria Colombia:** El participante que acertó la mayor cantidad de jugadores en la lista final de 26 convocados de Colombia.
- **🥅 El "Al Palo":** El participante que acertó más tendencias de juego (quién gana o si hay empate) pero sin dar en el marcador exacto.
- **🥱 El Conservador:** Quien apostó al empate más veces.
- **🐴 Caballo de Arranque:** El participante con mejor desempeño relativo en la fase de grupos en comparación con la fase de eliminación directa.
- **🐢 Tortuga Ninja:** El participante con mejor desempeño relativo en la fase de eliminación directa en comparación con la fase de grupos (el rey de las remontadas).
- **🎢 Montaña Rusa:** El participante más inconstante del torneo (con la mayor cantidad de transiciones entre sumar y no sumar puntos).
- **🐑 La Oveja Negra:** El participante que ha sumado la **menor cantidad de puntos** en los partidos.

## 🚀 Desarrollo Local

Si deseas ejecutar o modificar el proyecto en tu entorno local:

1. Clona el repositorio:
   ```bash
   git clone <url-del-repo>
   cd polla-futbolera
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Compila para producción:
   ```bash
   npm run build
   ```

---
*Hecho con pasión por el fútbol ⚽*
