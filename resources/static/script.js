const API_KEY = "7b870e9964c8423d91b18ff69d01e304";
const API_HOST = "v1.baseball.api-sports.io";
const API_SERVER = '';
const SEASON = "2025";
const LEAGUE = "1";
const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const SPORT_ID = 1; // Major League Baseball
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;



const datePicker = document.getElementById("datePicker");
let games = [];
let filter = 'live';

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
datePicker.value = `${yyyy}-${mm}-${dd}`;

async function getParticipantId(mlbId) {
    const res = await fetch(
        `${SPORTSRADAR_MAPS_BASE}?api_key=${SPORTSRADAR_API_KEY}`
    );
    const json = await res.json();
    const mapping = json.data.find((m) => m.external_id === String(mlbId));
    return mapping?.id;
}

function toAmerican(decimal) {
  if (!decimal || decimal <= 1) return "-";
  if (decimal >= 2) {
    return "+" + Math.round((decimal - 1) * 100);
  } else {
    return "" + Math.round(-100 / (decimal - 1));
  }
}

datePicker.addEventListener("change", fetchGames);


async function fetchGames() {
    const url = new URL(`https://${API_HOST}/games`);
url.searchParams.set("date", datePicker.value);
    url.searchParams.set("league", LEAGUE);
    url.searchParams.set("season", SEASON);
    url.searchParams.set("timezone", tz);

    try {
        const res = await fetch(url, {
            headers: {
                "x-apisports-key": API_KEY
            }
        });
        const j = await res.json();
        games = j.response || [];
    } catch (err) {
        console.error("Error fetching games:", err);
        games = [];
    }

    renderGames();
}

function renderEVInputTab() {
  const container = document.getElementById("fixturesContent");
  // inject the inputs + button all at once
  container.innerHTML = `
    <div class="ev-input-card">
      <h3>Calculate Expected Value</h3>
      <input id="ev-odds" type="number" placeholder="Odds (+150 or -200)" />
      <input id="ev-prob" type="number" placeholder="Win % (0–100)" />
      <button id="ev-calc-btn">Compute EV</button>
      <div id="ev-output"></div>
    </div>
  `;

  // now the elements actually exist, so this won't be null
  const btn = document.getElementById("ev-calc-btn");
  btn.addEventListener("click", () => {
    const o     = parseInt(document.getElementById("ev-odds").value, 10);
    const pInput= parseFloat(document.getElementById("ev-prob").value);
    if (isNaN(o) || isNaN(pInput)) {
      return alert("Please enter valid odds and win %.");
    }
    const trueProb  = pInput / 100;
    const evDecimal = calculateEv(trueProb, o);
    document.getElementById("ev-output").textContent =
      (evDecimal * 100).toFixed(2) + "%";
  });
}

/**
 * Calculates EV exactly the same way as EvCli.calculateEv(...)
 * @param {number} trueProb  Decimal between 0–1 (e.g. 0.55)
 * @param {number} odds      American odds (e.g. +150 or -110)
 * @returns {number}         EV as a decimal (0.02 → 2%)
 */
function calculateEv(trueProb, odds) {
  const implied = odds > 0
    ? 100 / (odds + 100)
    : -odds / (100 - odds);
  return trueProb - implied;
}




async function fetchTeamRoster(teamId) {
    const response = await fetch(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`
    );
    const data = await response.json();
    return data.roster;
}

filterBar.addEventListener("click", e => {
  if (!e.target.matches(".tab-btn")) return;
  filter = e.target.dataset.filter;
  // hide the date picker except on “upcoming”
  datePicker.style.display = filter === "upcoming" ? "inline-block" : "none";
  // clear or replace the main content
  if (filter === "evinput") {
    renderEVInputTab();
  } else {
    fetchGames();
  }  
});




datePicker.addEventListener("change", fetchGames);
fetchGames();

function displayPlayers(roster) {
    const container = document.getElementById("playersContainer");
    container.innerHTML = ""; // Clear existing content
    roster.forEach((player) => {
        const playerCard = document.createElement("div");
        playerCard.className = "player-card";
        playerCard.innerHTML = `
      <div class="player-name">${player.person.fullName}</div>
      <div class="player-position">${player.position.name}</div>
      <div class="player-jersey">#${player.jerseyNumber}</div>
    `;
        container.appendChild(playerCard);
    });
}


function renderGames() {

    const container = document.getElementById("fixturesContent");
    container.innerHTML = "";
    
    const list = filter === "live" ?
        games.filter(g => !["NS", "FT"].includes(g.status.short)) :
        games.filter(g => g.status.short === "NS");
    if (!list.length) {
        container.innerHTML = `<p style="text-align:center;">No ${filter} games.</p>`;
        return;
    }
    list.forEach(game => {
        const live = !["NS", "FT"].includes(game.status.short);
        const time = new Date(game.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
        const card = document.createElement("div");
        card.className = "fixture-card";
        card.innerHTML = `
        <div class="fixture-time">${time}${live?'<span class="live-badge">LIVE</span>':''}</div>
        <div class="teams">
          <div class="team">
            <img class="team-logo" src="${game.teams.home.logo}" alt="">
            <div class="team-name">${game.teams.home.name}</div>
          </div>
          <div class="score">${game.scores.home.total||"-"} – ${game.scores.away.total||"-"}</div>
          <div class="team">
            <img class="team-logo" src="${game.teams.away.logo}" alt="">
            <div class="team-name">${game.teams.away.name}</div>
          </div>
        </div>
      `;
        card.addEventListener("click", () => openModal(game));
        container.appendChild(card);
        if (live) {
            card.addEventListener("mouseenter", () => showWinOnHover(game, card), {
                once: true
            });
        }
    });
}


function openModal(game) {
    const isLive = !["NS", "FT"].includes(game.status.short);

    const tabs = [{
            id: "odds",
            label: "Odds"
        },
        {
            id: "h2h",
            label: "H2H"
        },
        {
            id: "players",
            label: "Players"
        },
        { 
          id: "expectedValue",
          label: "Expected Value" 
        },
    ];
    if (isLive) tabs.push({
        id: "live",
        label: "Live"
    });

    const tabsHTML = tabs.map((t, i) => `
      <button 
        data-tab="${t.id}" 
        class="${i===0 ? "active" : ""}"
      >${t.label}</button>
    `).join("");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
  <div class="modal-content">
    <button class="modal-close">&times;</button>
    <div class="modal-tabs">${tabsHTML}</div>
    <div id="modalPanel">Loading…</div>
  </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".modal-close").onclick = () => overlay.remove();

    overlay.querySelectorAll(".modal-tabs button").forEach(btn => {
        btn.onclick = () => {
            overlay.querySelectorAll(".modal-tabs button")
                .forEach(b => b.classList.toggle("active", b === btn));
            loadTab(game, btn.dataset.tab, overlay.querySelector("#modalPanel"));
        };
    });

    // kick off first tab
    loadTab(game, tabs[0].id, overlay.querySelector("#modalPanel"));
}

async function fetchPlayerProps(playerId) {
  const res = await fetch(`/api/props?playerId=${playerId}`);
  if (!res.ok) {
    throw new Error(`Failed to load props: ${res.status}`);
  }
  return res.json();  // returns [{ label, made, att, odds }, …]
}


/**
 * 1) Finds the live gamePk via schedule endpoint (codedGameState === "I")
 * 2) Fetches contextMetrics for that gamePk
 * 3) Tags the favorite (.fav) logo & name
 * 4) Updates the .win-text with the % value
 *
 * @param {Object} game   - game object from list
 * @param {HTMLElement} winEl  - the .win-text element
 * @param {HTMLElement} card   - the fixture-card element
 */

async function showWinOnHover(game, card) {
    const winEl = card.querySelector('.win-prob');
    try {
        const ctx = await fetch(`${BASE_URL}/game/${game.gamePk}/contextMetrics`).then(r => r.json());
        const hP = ctx.homeWinProbability;
        const aP = ctx.awayWinProbability;
        const fav = hP > aP ? 'home' : 'away';
        const pct = Math.max(hP, aP) * 100;
        // Highlight favorite
        const teamsEls = card.querySelectorAll('.team');
        const favEl = teamsEls[fav === 'home' ? 0 : 1];
        favEl.querySelector('.team-logo').classList.add('fav');
        favEl.querySelector('.team-name').classList.add('fav');
        winEl.textContent = `${pct.toFixed(1)}%`;
    } catch {
        winEl.textContent = 'N/A';
    }
}

async function fetchSeasonStats(playerId) {
  const res = await fetch(
    `${BASE_URL}/people/${playerId}/stats?stats=season&season=${SEASON}&gameType=R`
  );
  const data = await res.json();
  // return the first (and only) split’s stat object, or {} if missing
  return data.stats[0]?.splits[0]?.stat || {};
}

function computeProps(seasonStats) {
  const {
    hits = 0,
    atBats = 0,
    baseOnBalls = 0,
    strikeOuts = 0
  } = seasonStats;

  return [
    {
      label: 'BA',
      made: hits,
      att: atBats,
      odds: atBats ? (hits / atBats).toFixed(3) : '0.000'
    },
    {
      label: 'OBP',
      made: hits + baseOnBalls,
      att: atBats + baseOnBalls + strikeOuts,
      odds: (atBats + baseOnBalls + strikeOuts)
        ? ((hits + baseOnBalls) / (atBats + baseOnBalls + strikeOuts)).toFixed(3)
        : '0.000'
    }
  ];
}


async function fetchMultiFactorWinProb(game, card) {
    const payload = {
        gamePk: game.gamePk.toString()
    };
    try {
        const res = await fetch('/api/multiPredict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.error('multiPredict failed:', res.status);
            return;
        }
        const {
            homeProb,
            awayProb,
            liveHomePct,
            seasonHomePct,
            paceAdj
        } = await res.json();

        // pick the favorite and convert to %
        const favPct = Math.max(homeProb, awayProb) * 100;

        // update your card
        const winEl = card.querySelector('.win-prob');
        winEl.innerHTML = `
        <div class="win-prob-percent">${favPct.toFixed(1)}%</div>
        <small>
          live:${(liveHomePct*100).toFixed(1)}% |
          season:${(seasonHomePct*100).toFixed(1)}% |
          pace:${(paceAdj*100).toFixed(1)}%
        </small>
      `;
    } catch (err) {
        console.error('Error fetching multi-factor:', err);
    }
}


async function renderTeam(gameId, teamId, containerId) {
    const res = await fetch(`/api/players?game=${gameId}&team=${teamId}`);
    if (!res.ok) {
        document.getElementById(containerId).textContent =
            "Error " + res.status;
        return;
    }
    const data = await res.json();
    const grid = document.getElementById(containerId);
    grid.innerHTML = "";
    for (let p of data) {
        grid.insertAdjacentHTML(
            "beforeend",
            `
  <div class="player-card">
    <img class="player-photo"
         src="${p.player.photo}"
         alt="${p.player.name}">
    <div class="player-name">${p.player.name}</div>
  </div>`
        );
    }
}

async function loadTab(game, tab, panel) {
    console.log(">> loadTab:", tab);
    panel.innerHTML = `<p>Loading live data…</p>`;
    const gameDate = new Date(game.date).toISOString().split("T")[0];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const base = `https://${API_HOST}`;
    const headers = {
        "x-apisports-key": API_KEY
    };

    try {
        switch (tab) {
          case "odds": {
            try {
                const res = await fetch(`${API_SERVER}/api/odds?gameId=${game.id}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const books = json.response?.[0]?.bookmakers || [];
        
                panel.innerHTML = `
                  <select id="bkSelect"></select>
                  <div id="oddsTbl"></div>
                `;
        
                const sel = panel.querySelector("#bkSelect");
                sel.innerHTML = books
                    .map((b) => `<option value="${b.name}">${b.name}</option>`)
                    .join("");
                sel.onchange = () =>
                    renderOddsTbl(books, sel.value, panel, game);
                renderOddsTbl(books, books[0]?.name || "", panel, game);
            } catch (err) {
                console.error("Error loading odds:", err);
                panel.innerHTML = `<p style="color:red;">Failed to load odds: ${err.message}</p>`;
            }
            break;
        }
        

        case "h2h": {
          const homeId = game.teams.home.id;
          const awayId = game.teams.away.id;
          const seasons = [SEASON, String(+SEASON - 1)];
        
          panel.innerHTML = seasons.map(s => `
            <div class="h2h-season-box" data-season="${s}">
              <h4>Season ${s}</h4>
              <div class="h2h-summary">Loading summary…</div>
              <div class="h2h-table">Loading table…</div>
            </div>
          `).join("");
        
          for (let s of seasons) {
            const box = panel.querySelector(`.h2h-season-box[data-season="${s}"]`);
            const summary = box.querySelector(".h2h-summary");
            const table = box.querySelector(".h2h-table");
        
            try {
              const res = await fetch(`${API_SERVER}/api/h2h?homeId=${homeId}&awayId=${awayId}&season=${s}&league=${LEAGUE}`);
              const { response } = await res.json();
              const matches = response
                .filter(m => m.scores.home.total != null)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        
              const homeWins = matches.filter(m => m.scores.home.total > m.scores.away.total).length;
              const awayWins = matches.length - homeWins;
              const leader = homeWins > awayWins ? game.teams.home.name : game.teams.away.name;
              const leadPct = Math.round((Math.max(homeWins, awayWins) / Math.max(matches.length, 1)) * 100);
        
              summary.textContent = `${game.teams.home.name} ${homeWins}–${awayWins} ${game.teams.away.name} (${leader} ${leadPct}%)`;
        
              const rows = matches.map(m => {
                const date = new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const h = m.scores.home.total;
                const a = m.scores.away.total;
                const hc = h > a ? "winner" : "loser";
                const ac = a > h ? "winner" : "loser";
                return `
                  <tr>
                    <td>${date}</td>
                    <td>
                      <span class="${hc}">${game.teams.home.name}</span>
                      ${h}–${a}
                      <span class="${ac}">${game.teams.away.name}</span>
                    </td>
                  </tr>`;
              }).join("");
        
              table.innerHTML = rows.length
                ? `<table><tr><th>Date</th><th>Result</th></tr>${rows}</table>`
                : `<p>No matches found.</p>`;
            } catch (err) {
              summary.textContent = "Failed to load H2H";
              table.textContent = "";
              console.error("H2H error:", err);
            }
          }
        
          break;
        }
        

        case "players": {
          panel.innerHTML = `
            <div class="stark-toggle">
              <button data-team="home" class="active">${game.teams.home.name}</button>
              <button data-team="away">${game.teams.away.name}</button>
            </div>
            <div class="players-wrapper">
              <div id="playersGrid" class="players-grid"></div>
            </div>`;
        
          const grid = panel.querySelector("#playersGrid");
          const buttons = panel.querySelectorAll(".stark-toggle button");
        
          async function fetchRoster(teamName) {
            const res = await fetch(`${API_SERVER}/api/players?teamName=${encodeURIComponent(teamName)}&season=${SEASON}`);
            if (!res.ok) {
              grid.innerHTML = `<p style="color:red;">Failed to load roster for ${teamName}</p>`;
              return [];
            }
            const json = await res.json();
            return json.roster || [];
          }
        
          const [homeRoster, awayRoster] = await Promise.all([
            fetchRoster(game.teams.home.name),
            fetchRoster(game.teams.away.name),
          ]);
        
          function showRoster(roster) {
            grid.innerHTML = "";
            roster.forEach((p) => {
              const id = p.person?.id;
              const url = `https://img.mlbstatic.com/mlb-photos/image/upload/w_1024,h_1024,q_auto:best,f_auto/v1/people/${id}/headshot/67/current`;
              const card = document.createElement("div");
              card.className = "player-card";
              card.innerHTML = `
                <img class="player-photo" src="${url}" alt="${p.person.fullName}">
                <div class="player-info">
                  <div class="player-number">#${p.jerseyNumber || "—"}</div>
                  <div class="player-name">${p.person.fullName}</div>
                  <div class="player-position">${p.position.name}</div>
                </div>`;
              card.addEventListener("click", () =>
                showPlayerStats(p.person.id, p.person.fullName)
              );
              grid.appendChild(card);
            });
          }
        
          showRoster(homeRoster);
          buttons.forEach((btn) =>
            btn.addEventListener("click", () => {
              buttons.forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              const team = btn.dataset.team === "home" ? homeRoster : awayRoster;
              showRoster(team);
            })
          );
          break;
        }
        

        case "expectedValue": {
          panel.innerHTML = `<p>Loading expected value…</p>`;
          try {
            const res = await fetch(`/api/expected-value?gameId=${game.id}`);
            if (!res.ok) throw new Error(res.statusText);
            const evList = await res.json();
        
            const rows = evList.map(ev => {
              const homeAm = toAmerican(ev.homeOdds);
              const awayAm = toAmerican(ev.awayOdds);
              const homeEV = ev.evHomePercent;
              const awayEV = ev.evAwayPercent;
        
              // existing EV classes
              const homeEVClass = homeEV > 0
                ? 'ev-cell-positive highlight-ev'
                : 'ev-cell-negative';
              const awayEVClass = awayEV > 0
                ? 'ev-cell-positive highlight-ev'
                : 'ev-cell-negative';
        
              // new odds classes: apply same highlight when EV > 0
              const homeOddsClass = homeEV > 0 ? 'highlight-ev' : '';
              const awayOddsClass = awayEV > 0 ? 'highlight-ev' : '';
        
              const rowClass = ev.bookmaker.toLowerCase() === 'pinnacle'
                ? 'ev-row-pinnacle'
                : '';
        
              return `
                <tr class="${rowClass}">
                  <td>${ev.bookmaker}</td>
                  <td class="${homeOddsClass}">${homeAm}</td>
                  <td class="${homeEVClass}">${homeEV.toFixed(2)}%</td>
                  <td class="${awayOddsClass}">${awayAm}</td>
                  <td class="${awayEVClass}">${awayEV.toFixed(2)}%</td>
                </tr>`;
            }).join('');
        
            panel.innerHTML = `
              <div class="ev-results">
                <h4>Expected Value (vs Pinnacle)</h4>
                <table class="ev-table">
                  <thead>
                    <tr>
                      <th>Bookmaker</th>
                      <th>${game.teams.home.name} Odds</th>
                      <th>EV%</th>
                      <th>${game.teams.away.name} Odds</th>
                      <th>EV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || `<tr><td colspan="5">No EV data for this game.</td></tr>`}
                  </tbody>
                </table>
              </div>`;
          } catch (err) {
            console.error(err);
            panel.innerHTML = `<p style="color:red;">Failed to load EV data: ${err.message}</p>`;
          }
          break;
        }
        
            
            
            
            
            

            case "live": {
              // show interim loading
              panel.innerHTML = `<p>Loading live data…</p>`;
            
              // build the MLB schedule URL (hydrate only the linescore)
              const scheduleUrl = `${BASE_URL}/schedule` +
                `?date=${gameDate}` +
                `&sportId=${SPORT_ID}` +
                `&hydrate=linescore` +
                `&timezone=${tz}`;
            
              // fetch the schedule, find the matching gamePk
              const sched = await fetch(scheduleUrl).then(r => r.json());
              const mlbGame = sched.dates?.[0]?.games.find(g =>
                g.teams.home.team.name.toLowerCase() === game.teams.home.name.toLowerCase() &&
                g.teams.away.team.name.toLowerCase() === game.teams.away.name.toLowerCase()
              );
            
              if (!mlbGame) {
                panel.innerHTML = `<p>Game not found in MLB schedule.</p>`;
                break;
              }
              const { gamePk } = mlbGame;
            
              // fire off both realtime calls in parallel
              const [ctx, lsRes] = await Promise.all([
                fetch(`${BASE_URL}/game/${gamePk}/contextMetrics`).then(r => r.json()),
                fetch(`${BASE_URL}/game/${gamePk}/linescore?timezone=${tz}`).then(r => r.json())
              ]);
            
              // pull win-probs and format as percentages
              const hWP = (ctx.homeWinProbability * 100).toFixed(1);
              const aWP = (ctx.awayWinProbability * 100).toFixed(1);
            
              // build inning headers & cells
              const inningLabels = lsRes.linescore.innings
                .map(i => `<th>${i.ordinal ?? i.ordinalNum}</th>`).join("");
              const awayCells = lsRes.linescore.innings
                .map(i => `<td>${typeof i.away === "object" ? i.away.runs : i.away}</td>`).join("");
              const homeCells = lsRes.linescore.innings
                .map(i => `<td>${typeof i.home === "object" ? i.home.runs : i.home}</td>`).join("");
            
              // render the full live table
              panel.innerHTML = `
                <h3>Live</h3>
                <div class="live-probabilities">
                  <strong>${game.teams.home.name}</strong> ${hWP}% &nbsp;|&nbsp;
                  <strong>${game.teams.away.name}</strong> ${aWP}%
                </div>
                <table class="linescore">
                  <tr>
                    <th>Inning</th>${inningLabels}<th>R</th><th>H</th><th>E</th>
                  </tr>
                  <tr>
                    <td>${game.teams.away.name}</td>${awayCells}
                    <td>${lsRes.linescore.teams.away.runs}</td>
                    <td>${lsRes.linescore.teams.away.hits}</td>
                    <td>${lsRes.linescore.teams.away.errors || 0}</td>
                  </tr>
                  <tr>
                    <td>${game.teams.home.name}</td>${homeCells}
                    <td>${lsRes.linescore.teams.home.runs}</td>
                    <td>${lsRes.linescore.teams.home.hits}</td>
                    <td>${lsRes.linescore.teams.home.errors || 0}</td>
                  </tr>
                </table>
              `;
              break;
            }
            
            

            default:
                panel.innerHTML = "<p>Unknown tab.</p>";
        }
    } catch (err) {
        panel.innerHTML = `<p>Error loading ${tab}: ${err.message}</p>`;
    }
}


async function showPlayerStats(playerId, playerName) {
  // 1) fetch game‑log details
  const resLog = await fetch(
    `${BASE_URL}/people/${playerId}/stats?stats=gameLog&season=${SEASON}&gameType=R`
  );
  const logJson = await resLog.json();
  const details = await Promise.all(
    (logJson.stats[0]?.splits || []).map(async s => {
      const date = s.date.split('T')[0];
      const sched = await fetch(
        `${BASE_URL}/schedule?date=${date}&sportId=${SPORT_ID}&hydrate=teams`
      ).then(r => r.json());
      const g = sched.dates[0]?.games.find(
        g => g.teams.home.team.id === s.team.id
           || g.teams.away.team.id === s.team.id
      );
      return g
        ? { date, stat: s.stat, home: g.teams.home.team, away: g.teams.away.team, gamePk: g.gamePk }
        : null;
    })
  );

  // 2) build game‑log HTML
  const rows = details.filter(Boolean).map(d => `
    <tr data-gamepk="${d.gamePk}">
      <td class="game-cell">
        <img class="team-logo-small" src="https://www.mlbstatic.com/team-logos/${d.home.id}.svg"/>
        <span>at</span>
        <img class="team-logo-small" src="https://www.mlbstatic.com/team-logos/${d.away.id}.svg"/>
        <div>${new Date(d.date).toLocaleDateString()}</div>
      </td>
      <td>${d.stat.atBats||0}</td>
      <td>${d.stat.runs||0}</td>
      <td>${d.stat.hits||0}</td>
      <td>${d.stat.rbi||0}</td>
      <td>${d.stat.baseOnBalls||0}</td>
      <td>${d.stat.strikeOuts||0}</td>
    </tr>
  `).join('');

  const originalHtml = `
    <h4 style="text-align:center;color:#00f7ff;">
      ${playerName} – ${SEASON} Game Log
    </h4>
    <table>
      <tr><th>Game</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>SO</th></tr>
      ${rows}
    </table>
  `;

  // 3) create modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="position:relative">
      <button class="modal-close">&times;</button>
      <div id="statsContainer">${originalHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').onclick = () => overlay.remove();

  // 4) add Props button
  const btn = document.createElement('button');
  btn.textContent = 'Props';
  btn.className = 'tab-btn';
  btn.style.position = 'absolute';
  btn.style.top = '1rem';
  btn.style.left = '1rem';
  overlay.querySelector('.modal-content').appendChild(btn);

  // 5) toggle split‑view & load props
  btn.onclick = async () => {
    const mc = overlay.querySelector('.modal-content');
    const split = mc.classList.toggle('split');
    mc.querySelectorAll('#statsContainer, #propsContainer').forEach(el => el.remove());

    if (split) {
      const propsDiv = document.createElement('div');
      propsDiv.id = 'propsContainer';
      propsDiv.className = 'panel';
      const statsDiv = document.createElement('div');
      statsDiv.id = 'statsContainer';
      statsDiv.className = 'panel';
      statsDiv.innerHTML = originalHtml;
      mc.append(propsDiv, statsDiv);

      // fetch & render backend props
      try {
        const props = await fetchPlayerProps(playerId);
        renderPlayerProps(props, propsDiv);
      } catch (e) {
        propsDiv.textContent = e.message;
      }
    } else {
      const statsDiv = document.createElement('div');
      statsDiv.id = 'statsContainer';
      statsDiv.innerHTML = originalHtml;
      mc.appendChild(statsDiv);
    }

    overlay.querySelector('.modal-close').onclick = () => overlay.remove();
  };

  // 6) drill‑in on row click
  overlay.querySelectorAll('tr[data-gamepk]').forEach(row => {
    row.onclick = () => {
      const pk = row.dataset.gamepk;
      if (pk) showGameStats(pk);
    };
  });
}






async function calculateWinProb(game, card) {
    try {
        // 1) Find the MLB gamePk via the Stats API schedule
        const date = new Date(game.date).toISOString().split('T')[0];
        const schedRes = await fetch(
            `https://statsapi.mlb.com/api/v1/schedule?date=${date}&sportId=1&hydrate=teams`
        );
        const schedJson = await schedRes.json();
        const mlbGame = schedJson.dates?.[0]?.games.find(g =>
            g.teams.home.team.name === game.teams.home.name &&
            g.teams.away.team.name === game.teams.away.name
        );
        if (!mlbGame) throw new Error('Game not found');

        // 2) Fetch live win‑probability metrics
        const metricsRes = await fetch(
            `https://statsapi.mlb.com/api/v1/game/${mlbGame.gamePk}/contextMetrics`
        );
        const metricsJson = await metricsRes.json();
        // These props are at the top level of the JSON
        const {
            homeWinProbability,
            awayWinProbability
        } = metricsJson;

        // 3) Determine favorite and render logo + percentage
        const favSide = homeWinProbability > awayWinProbability ? 'home' : 'away';
        const favProb = Math.max(homeWinProbability, awayWinProbability);
        const logoUrl = game.teams[favSide].logo;
        const winProbEl = card.querySelector('.win-prob');

        winProbEl.innerHTML = `
        <div class="divider"></div>
        <img src="${logoUrl}" class="win-prob-logo" alt="fav team logo"/>
        <span class="win-prob-percent">${(favProb * 100).toFixed(1)}%</span>
      `;
    } catch {
        card.querySelector('.win-prob').textContent = 'N/A';
    }
}


async function showGameStats(gamePk) {
    const res = await fetch(
        `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`
    );
    const json = await res.json();
    const homeTeam = json.teams.home;
    const awayTeam = json.teams.away;
    const allPlayers = json.players;
    const makeTeamSection = (team) => {
        const section = document.createElement("div");
        section.innerHTML = `
<h4 style="text-align:center; color:#00f7ff; margin-bottom:1rem;">
  ${team.team?.name || "Unknown Team"}
</h4>
<div class="team-roster"></div>
`;
        const container = section.querySelector(".team-roster");

        function statLabel(key) {
            const map = {
                atBats: "AB",
                hits: "H",
                runs: "R",
                rbi: "RBI",
                baseOnBalls: "BB",
                strikeOuts: "K",
                inningsPitched: "IP",
                earnedRuns: "ER",
                strikeouts: "K",
                baseonBalls: "BB",
                hitsAllowed: "H",
                homeRuns: "HR",
            };
            return map[key] || key;
        }

        const renderPlayerRow = (player, type = "batting") => {
            const s = player.stats?.[type] || {};
            const photo = `https://img.mlbstatic.com/mlb-photos/image/upload/w_128,h_128,q_auto:best,f_auto/v1/people/${player.person.id}/headshot/67/current`;

            const relevantKeys =
                type === "batting" ?
                [
                    "atBats",
                    "hits",
                    "runs",
                    "rbi",
                    "baseOnBalls",
                    "strikeOuts",
                ] :
                [
                    "inningsPitched",
                    "strikeOuts",
                    "earnedRuns",
                    "baseOnBalls",
                ];

            const displayStats =
                relevantKeys
                .filter((k) => s[k] && parseFloat(s[k]) > 0)
                .map((k) => `${s[k]} ${statLabel(k)}`)
                .join(" | ") || "—";

            const row = document.createElement("div");
            row.className = "player-row";
            if (displayStats === "—") row.classList.add("inactive-row");

            row.innerHTML = `
<img class="player-thumb" src="${photo}" />
<div class="player-row-info">
  <div class="row-top">
    <span class="player-name${displayStats === "—" ? " no-impact" : ""}">
      #${player.jerseyNumber || "—"} ${player.person.fullName}
    </span>
    <span class="player-position">${player.position?.abbreviation || ""}</span>
  </div>
  <div class="row-stats">${displayStats}</div>
</div>`;
            return {
                row,
                isActive: displayStats !== "—"
            };
        };

        const processGroup = (label, key) => {
            const players = Object.values(team.players || {}).filter(
                (p) => p.stats?.[key] && p.person
            );
            if (!players.length) return;

            const sectionLabel = document.createElement("div");
            sectionLabel.className = "section-divider";
            sectionLabel.textContent = label;
            container.appendChild(sectionLabel);

            const rendered = players.map((p) => renderPlayerRow(p, key));
            const activeRows = rendered
                .filter((r) => r.isActive)
                .map((r) => r.row);
            const inactiveRows = rendered
                .filter((r) => !r.isActive)
                .map((r) => r.row);

            activeRows.forEach((row) => container.appendChild(row));

            if (inactiveRows.length) {
                const divider = document.createElement("div");
                divider.className = "row-sub-divider";
                container.appendChild(divider);
                inactiveRows.forEach((row) => container.appendChild(row));
            }
        };

        processGroup("Batters", "batting");
        processGroup("Pitchers", "pitching");

        return section;
    };

    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
<div class="modal-content">
  <button class="modal-close">&times;</button>
  <h3 style="text-align:center; color:#00f7ff; margin-bottom:1rem;">Game Stats</h3>
  <div class="game-stats-grid"></div>
</div>`;

    const content = overlay.querySelector(".game-stats-grid");
    content.style.display = "grid";
    content.style.gridTemplateColumns = "1fr 1fr";
    content.style.gap = "2rem";

    content.appendChild(makeTeamSection(homeTeam));
    content.appendChild(makeTeamSection(awayTeam));

    document.body.appendChild(overlay);
    overlay.querySelector(".modal-close").onclick = () => overlay.remove();
}

function renderPlayerProps(props, container) {
  container.innerHTML = '';  
  const table = document.createElement('table');
  table.className = 'props-table';
  table.innerHTML = `
    <thead>
      <tr><th>Stat</th><th>Made / Att</th><th>Odds</th></tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  props.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.label}</td>
      <td>${p.made}/${p.att}</td>
      <td>${p.odds}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

async function onPropsToggle(playerId, modalContent) {
  // ensure a clean panel
  let propsPanel = modalContent.querySelector('#propsContainer');
  if (!propsPanel) {
    propsPanel = document.createElement('div');
    propsPanel.id = 'propsContainer';
    propsPanel.className = 'panel';
    modalContent.appendChild(propsPanel);
  }
  try {
    const props = await fetchPlayerProps(playerId);
    renderPlayerProps(props, propsPanel);
  } catch (err) {
    propsPanel.textContent = err.message;
  }
}

function renderOddsTbl(bookmakers, selectedName, panel, game) {
    const book = bookmakers.find((b) => b.name === selectedName);
    const bet = book?.bets.find((b) => b.id === 1);
    const hDec = parseFloat(bet?.values[0]?.odd) || null;
    const aDec = parseFloat(bet?.values[1]?.odd) || null;
    const hAm = formatAmerican(hDec);
    const aAm = formatAmerican(aDec);
    const ph = hDec ? 1 / hDec : 0;
    const pa = aDec ? 1 / aDec : 0;

    panel.querySelector("#oddsTbl").innerHTML = `
<table>
  <tr>
    <th>Bookmaker</th>
    <th>${game.teams.home.name} Odds</th>
    <th>${game.teams.away.name} Odds</th>
    <th>Implied %</th>
  </tr>
  <tr>
    <td>${book.name}</td>
    <td>${hAm}</td>
    <td>${aAm}</td>
    <td>${(ph * 100).toFixed(1)}% / ${(pa * 100).toFixed(1)}%</td>
  </tr>
</table>
`;
}




function formatAmerican(decimalOdd) {
    if (!decimalOdd) return "-";
    return decimalOdd >= 2 ?
        `+${Math.round((decimalOdd - 1) * 100)}` :
        `${Math.round(-100 / (decimalOdd - 1))}`;
}

// initial load

fetchGames();