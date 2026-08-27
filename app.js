"use strict";
/*
 * FlakoPerformance — front-end. Lee sitio_datos.json (generado por
 * generar_datos_sitio.py, que reusa el cómputo de generar_dashboard.py tal
 * cual) y renderiza en el navegador. Ninguna lógica de negocio nueva acá:
 * los lookups de formato/color/columnas son los mismos que ya vivían en
 * generar_dashboard.py, portados de Python a JS.
 */

// --------------------------------------------------------------- constantes

var UMBRAL_CAMBIO = 0.20;
var UMBRAL_DIVERGENCIA_MER = 0.30;

var ORDEN_PRIORIDAD = ["STOP", "GASTO ALTO", "REDUCIR", "PUSH", "WATCH", "EN APRENDIZAJE", "EXCLUIR"];
var ORDEN_TIPOS = ["ventas", "leads", "mensajes", "trafico", "reconocimiento", "perfil", "generico"];

var ETIQUETA_TIPO = {
  ventas: "ventas", leads: "leads/formularios", mensajes: "mensajes/WhatsApp",
  trafico: "tráfico", reconocimiento: "reconocimiento/alcance", perfil: "visitas a perfil",
  generico: "sin clasificar",
};

var KPI_POR_TIPO = {
  ventas: [["compras", "Compras", "int"], ["roas_ponderado", "ROAS ponderado", "roas"]],
  leads: [["resultados", "Leads generados", "int"], ["costo_promedio", "Costo por lead", "money"]],
  mensajes: [["resultados", "Mensajes generados", "int"], ["costo_promedio", "Costo por mensaje", "money"]],
  trafico: [["resultados", "Visitas a la landing", "int"], ["costo_promedio", "Costo por visita", "money"]],
  reconocimiento: [
    ["alcance", "Alcance", "int"],
    ["costo_promedio", "Costo por 1.000 alcanzados", "money"],
    ["seguidores", "Seguidores ganados", "int_opcional"],
  ],
  perfil: [["resultados", "Visitas al perfil", "int"], ["costo_promedio", "Costo por visita a perfil", "money"]],
  generico: [["resultados", "Resultados", "int"], ["costo_promedio", "Costo por resultado", "money"]],
};

var COLUMNAS_POR_TIPO = {
  ventas: [
    { campo: "Resultados", etiqueta: "Result.", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/res.", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "Compras", etiqueta: "Compras", num: true },
    { campo: "ROAS de compras", etiqueta: "ROAS", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  leads: [
    { campo: "Resultados", etiqueta: "Leads", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/lead", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  mensajes: [
    { campo: "Resultados", etiqueta: "Mensajes", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/mensaje", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  trafico: [
    { campo: "Resultados", etiqueta: "Visitas", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/visita", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  reconocimiento: [
    { campo: "Alcance", etiqueta: "Alcance", num: true },
    { campo: "Resultados", etiqueta: "Result. (views)", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/result.", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "Seguidores", etiqueta: "Seguidores", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  perfil: [
    { campo: "Resultados", etiqueta: "Visitas a perfil", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/visita", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
  generico: [
    { campo: "Resultados", etiqueta: "Result.", num: true },
    { campo: "Costo por resultado", etiqueta: "Costo/res.", num: true, flecha: true },
    { campo: "Importe gastado", etiqueta: "Gastado", num: true },
    { campo: "Compras", etiqueta: "Compras", num: true },
    { campo: "ROAS de compras", etiqueta: "ROAS", num: true },
    { campo: "CTR", etiqueta: "CTR", num: true },
    { campo: "Frecuencia", etiqueta: "Frec.", num: true },
  ],
};

var TOOLTIP_COLUMNA = {
  "Result.": "Cantidad de resultados logrados en la ventana, según el objetivo del anuncio",
  "Result. (views)": "Cantidad de resultados de reconocimiento (ej. reproducciones) en la ventana",
  "Leads": "Cantidad de formularios/leads completados",
  "Mensajes": "Cantidad de conversaciones de WhatsApp/Messenger iniciadas",
  "Visitas": "Cantidad de clics que llevaron a la página de destino",
  "Visitas a perfil": "Cantidad de visitas al perfil de Instagram/Facebook generadas por el anuncio",
  "Costo/res.": "Cuánto costó, en promedio, cada resultado",
  "Costo/lead": "Cuánto costó, en promedio, cada lead",
  "Costo/mensaje": "Cuánto costó, en promedio, cada conversación de WhatsApp iniciada",
  "Costo/visita": "Cuánto costó, en promedio, cada visita",
  "Costo/result.": "Cuánto costó, en promedio, cada resultado de reconocimiento",
  "Gastado": "Total invertido en este anuncio durante la ventana",
  "Compras": "Cantidad de compras atribuidas a este anuncio según Meta",
  "ROAS": "Retorno de la inversión publicitaria: por cada $1 invertido, cuánto facturaste según Meta",
  "CTR": "Porcentaje de personas que vieron el anuncio y tocaron el link",
  "Frec.": "Cuántas veces en promedio cada persona vio este anuncio — muy alto puede ser señal de audiencia saturada",
  "Alcance": "Cantidad de personas únicas que vieron el anuncio",
  "Seguidores": "Cantidad de seguidores nuevos que ganó la página gracias al anuncio",
};

var CAMPOS_ENTEROS = new Set(["Resultados", "Alcance", "Compras", "Seguidores"]);
var CAMPOS_MONEDA = new Set(["Costo por resultado", "Importe gastado"]);
var OBJETIVO_A_TIPO_FALLBACK = { ventas: "ventas", mensajes: "mensajes", leads: "leads" };

// techo de frecuencia "sano" por tipo, calibrado contra una ventana de 7 días
// (mismo criterio que generar_dashboard.py usa para fatiga de campaña) —
// acá solo alimenta el medidor visual de frecuencia por anuncio, no cambia
// ninguna recomendación.
var FREC_UMBRAL = { ventas: 4.0, leads: 4.0, mensajes: 5.0, trafico: 4.0, perfil: 4.0, reconocimiento: 7.0, generico: 4.5 };
var DIAS_VENTANA_REFERENCIA = 7;

var BADGE_V2 = {
  PUSH: { cls: "b-good", icon: "↑" },
  REDUCIR: { cls: "b-warn", icon: "↓" },
  STOP: { cls: "b-crit", icon: "×" },
  "GASTO ALTO": { cls: "b-warn", icon: "!" },
  ENTREGA: { cls: "b-warn", icon: "◐" },
  FATIGA: { cls: "b-warn", icon: "⟳" },
  CUENTA: { cls: "b-crit", icon: "!" },
  WATCH: { cls: "b-mute", icon: "·" },
  "EN APRENDIZAJE": { cls: "b-mute", icon: "◐" },
  EXCLUIR: { cls: "b-mute", icon: "−" },
};
var RECO_SEV = {
  PUSH: "good", WATCH: "mute", "EN APRENDIZAJE": "mute", EXCLUIR: "mute",
  REDUCIR: "warn", "GASTO ALTO": "warn", ENTREGA: "warn", FATIGA: "warn",
  STOP: "crit", CUENTA: "crit",
};
var SEV_WORD = { critical: "Urgente", warning: "Revisar", good: "En orden", neutral: "Sin datos" };
var SEV_CLASS = { critical: "sev-crit", warning: "sev-warn", good: "sev-good", neutral: "sev-neutral" };

var SUG_HINT = {
  PUSH: "~+20-30%, escalar gradual", REDUCIR: "~-25% del gasto de la ventana", STOP: "pausar el anuncio",
  "GASTO ALTO": "revisar presupuesto o puja", ENTREGA: "posible problema de entrega",
  FATIGA: "refrescar creativo o ampliar público", CUENTA: "revisar en Business Manager",
  WATCH: "seguir monitoreando", "EN APRENDIZAJE": "esperar aprendizaje", EXCLUIR: "no está corriendo",
};
var SUG_CLASS = { PUSH: "sug-good", STOP: "sug-crit", REDUCIR: "sug-crit", "GASTO ALTO": "sug-crit", ENTREGA: "sug-crit", FATIGA: "sug-crit", CUENTA: "sug-crit" };

// ------------------------------------------------------------------ helpers

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function capitalize(s) {
  return s && s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function parseNumero(valor) {
  if (valor === null || valor === undefined) return null;
  var s = String(valor).trim();
  if (s === "" || s === "-") return null;
  s = s.replace(/[^\d,.\-]/g, "");
  if (s === "") return null;
  if (s.indexOf(",") !== -1 && s.indexOf(".") !== -1) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.indexOf(",") !== -1) {
    var partes = s.split(",");
    if (partes[partes.length - 1].length === 3 && partes.length > 1) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/,/g, ".");
    }
  }
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function numAR(n, decimals) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function money(v, moneda) {
  moneda = moneda || "ARS";
  if (v === null || v === undefined) return "—";
  return moneda + " $" + Math.round(v).toLocaleString("es-AR");
}

function moneyHtml(v, moneda) {
  moneda = moneda || "ARS";
  if (v === null || v === undefined) return '<span class="none">—</span>';
  return '<span class="cur">' + esc(moneda) + "</span>$" + Math.round(v).toLocaleString("es-AR");
}

function fmtKpi(valor, formato, moneda) {
  if (valor === null || valor === undefined) return "—";
  if (formato === "int" || formato === "int_opcional") return Math.round(valor).toLocaleString("es-AR");
  if (formato === "money") return money(valor, moneda);
  if (formato === "roas") return numAR(valor, 2) + "x";
  return String(valor);
}

function fmtCelda(campo, valorCrudo, moneda) {
  var valor = parseNumero(valorCrudo);
  if (valor === null) return '<span class="none">—</span>';
  if (CAMPOS_ENTEROS.has(campo)) {
    var ent = Math.round(valor);
    return ent === 0 ? '<span class="zero">0</span>' : ent.toLocaleString("es-AR");
  }
  if (CAMPOS_MONEDA.has(campo)) return moneyHtml(valor, moneda);
  if (campo === "ROAS de compras") return numAR(valor, 2) + "x";
  if (campo === "CTR") return numAR(valor, 2) + "%";
  if (campo === "Frecuencia") return numAR(valor, 2);
  return esc(valorCrudo);
}

function thTooltip(etiqueta) {
  var tip = TOOLTIP_COLUMNA[etiqueta];
  return tip ? ' title="' + esc(tip) + '"' : "";
}

function normalizarTxt(s) {
  s = (s || "").toLowerCase();
  var pares = [["á", "a"], ["é", "e"], ["í", "i"], ["ó", "o"], ["ú", "u"]];
  for (var i = 0; i < pares.length; i++) s = s.split(pares[i][0]).join(pares[i][1]);
  return s;
}

function tipoCampania(nombreCampania, nombreConjunto, objetivoCliente) {
  var n = normalizarTxt((nombreCampania || "") + " " + (nombreConjunto || ""));
  if (n.indexOf("venta") !== -1 || n.indexOf("compra") !== -1) return "ventas";
  if (n.indexOf("lead") !== -1 || n.indexOf("formulario") !== -1) return "leads";
  if (n.indexOf("mensaje") !== -1 || n.indexOf("msj") !== -1 || n.indexOf("whatsapp") !== -1 || n.indexOf("interacc") !== -1) return "mensajes";
  if (n.indexOf("trafico") !== -1 || n.indexOf("landing") !== -1) return "trafico";
  if (n.indexOf("alcance") !== -1 || n.indexOf("reconocimiento") !== -1 || n.indexOf("awareness") !== -1 || n.indexOf("video") !== -1 || n.indexOf("seguidor") !== -1) return "reconocimiento";
  if (n.indexOf("perfil") !== -1) return "perfil";
  return OBJETIVO_A_TIPO_FALLBACK[objetivoCliente] || "generico";
}

function esRemarketing(nombreCampania, nombreConjunto) {
  var n = normalizarTxt((nombreCampania || "") + " " + (nombreConjunto || ""));
  var claves = ["rmkt", "remarketing", "retarget", "warm", "compradores", "lookalike"];
  return claves.some(function (k) { return n.indexOf(k) !== -1; });
}

function frecuenciaUmbral(tipo, remarketing, diasVentana) {
  var base = (FREC_UMBRAL[tipo] || 4.5) * (diasVentana / DIAS_VENTANA_REFERENCIA);
  return remarketing ? base * 1.6 : base;
}

function freqMeterHtml(valorNum, tipo, diasVentana, remk) {
  if (valorNum === null || valorNum === undefined || !diasVentana) return "";
  var umbral = frecuenciaUmbral(tipo, remk, diasVentana);
  var ratio = umbral > 0 ? valorNum / umbral : 0;
  var cls = ratio >= 1 ? "f-hot" : (ratio >= 0.8 ? "f-warn" : (ratio >= 0.4 ? "f-ok" : "f-low"));
  return '<span class="freq-meter ' + cls + '"><i></i></span>';
}

function deltaHtml(cambio) {
  if (cambio === null || cambio === undefined) return "";
  var pct = Math.round(cambio * 100);
  if (cambio >= UMBRAL_CAMBIO) return '<span class="delta d-up">↑ +' + pct + '%</span>';
  if (cambio <= -UMBRAL_CAMBIO) return '<span class="delta d-down">↓ ' + pct + '%</span>';
  return '<span class="delta d-flat">→ estable</span>';
}

function montoSugeridoV2(reco, gastoFila, moneda) {
  var cls = SUG_CLASS[reco] || "sug-mute";
  var v;
  if (reco === "REDUCIR" && gastoFila) v = "-" + money(gastoFila * 0.25, moneda);
  else if (reco === "PUSH" && gastoFila) v = "+" + money(gastoFila * 0.25, moneda);
  else if (reco === "STOP") v = gastoFila ? "-" + money(gastoFila, moneda) : (moneda + " $0");
  else if (reco === "GASTO ALTO" || reco === "ENTREGA" || reco === "FATIGA") v = "revisar hoy";
  else if (reco === "CUENTA") v = "—";
  else v = "sin acción";
  return { v: v, h: SUG_HINT[reco] || "", cls: cls };
}

function adCopyHtml(r, maxLen) {
  maxLen = maxLen || 90;
  var texto = (r["Texto anuncio"] || "").trim();
  if (!texto) return "";
  var corto = texto.length <= maxLen ? texto : texto.slice(0, maxLen).replace(/\s+$/, "") + "…";
  return '<div class="ad-copy">“' + esc(corto) + '”</div>';
}

function resaltarMotivo(texto) {
  var t = esc(texto || "");
  t = t.replace(/\b(ARS|USD)\s\$[\d.,]+/g, '<span class="hl">$&</span>');
  t = t.replace(/[+\-~]?\d+(?:[.,]\d+)?%/g, '<span class="hl">$&</span>');
  return t;
}

function formatMotivo(motivo) {
  var t = motivo || "";
  var idx = t.indexOf(" — ");
  if (idx === -1) return resaltarMotivo(t);
  return "<b>" + resaltarMotivo(t.slice(0, idx)) + "</b>" + resaltarMotivo(t.slice(idx));
}

// -------------------------------------------------------- lecturas de datos

function tiposConGasto(p) {
  var tipos = new Set();
  [p.v7, p.v3].forEach(function (ventana) {
    if (!ventana) return;
    Object.keys(ventana.por_tipo || {}).forEach(function (t) {
      var d = ventana.por_tipo[t];
      if (d && d.gasto) tipos.add(t);
    });
  });
  return ORDEN_TIPOS.filter(function (t) { return tipos.has(t); });
}

function advertenciaMer(estadoCuenta, ventana, moneda) {
  var ventasReales = estadoCuenta.ventas_reales_ars;
  if (ventasReales === null || ventasReales === undefined || !ventana || !ventana.gasto_total || moneda !== "ARS") return null;
  var roasMeta = ventana.roas_ponderado;
  if (!roasMeta) return null;
  var merReal = ventasReales / ventana.gasto_total;
  var divergencia = Math.abs(merReal - roasMeta) / roasMeta;
  if (divergencia < UMBRAL_DIVERGENCIA_MER) return null;
  return "⚠ Meta dice que estás facturando " + numAR(roasMeta, 2) + " por cada $1 invertido (ROAS), pero según la venta real que cargaste (" +
    money(ventasReales, "ARS") + ") contra el gasto (" + money(ventana.gasto_total, moneda) + ") en realidad estás facturando " +
    numAR(merReal, 2) + " por cada $1 (tu MER real) — una diferencia de ~" + Math.round(divergencia * 100) +
    "%. La plataforma puede estar sobreestimando, no uses el ROAS de Meta como única referencia para escalar presupuesto";
}

function resumenConteoTxt(ventana) {
  if (!ventana) return "sin datos";
  var partes = ORDEN_PRIORIDAD.filter(function (k) { return ventana.conteo[k] > 0; })
    .map(function (k) { return ventana.conteo[k] + " " + k; });
  return partes.length ? partes.join(" · ") : "sin anuncios activos con gasto";
}

// ------------------------------------------------------------ sparkline

function sparkChart(p) {
  var minCortes = p.costo_serie_min_cortes || 3;
  var label = p.costo_serie_label || "costo/resultado";
  var serie = (p.costo_serie || []).filter(function (v) { return v !== null && v !== undefined; });
  if (serie.length < minCortes) {
    var msg = serie.length ? (serie.length + " corte(s) con datos — sin serie para comparar") : "sin serie para comparar";
    return '<div class="spark"><div class="spark-empty">' + esc(msg) + "</div>" +
      '<div class="spark-cap"><span>' + esc(label) + "</span><span></span></div></div>";
  }
  var ultimo = serie[serie.length - 1];
  var previos = serie.slice(0, -1);
  var avg = previos.reduce(function (a, b) { return a + b; }, 0) / previos.length;
  var pct = avg ? (ultimo - avg) / avg : 0;
  var peor = pct >= UMBRAL_CAMBIO, mejor = pct <= -UMBRAL_CAMBIO;
  var stroke = peor ? "#dd5a4c" : (mejor ? "#6f9f74" : "#9c9186");
  var fill = peor ? "rgba(221,90,76,.15)" : "rgba(111,159,116,.14)";
  var W = 240, H = 52, PAD = 8;
  var lo = Math.min.apply(null, serie), hi = Math.max.apply(null, serie);
  var span = (hi - lo) || 1;
  var innerW = W - PAD * 2, innerH = H - PAD * 2;
  var pts = serie.map(function (v, i) {
    var x = PAD + innerW * (serie.length === 1 ? 0 : i / (serie.length - 1));
    var y = PAD + innerH * (1 - (v - lo) / span);
    return [x, y];
  });
  var avgY = PAD + innerH * (1 - (avg - lo) / span);
  var last = pts[pts.length - 1];
  var polyline = pts.map(function (c) { return c[0].toFixed(1) + "," + c[1].toFixed(1); }).join(" ");
  var areaPath = "M" + pts.map(function (c) { return c[0].toFixed(1) + "," + c[1].toFixed(1); }).join(" L") +
    " L" + last[0].toFixed(1) + "," + avgY.toFixed(1) + " L" + pts[0][0].toFixed(1) + "," + avgY.toFixed(1) + " Z";
  var pctTxt = (pct >= 0 ? "+" : "") + Math.round(pct * 100) + "%";
  var capTxt = (!peor && !mejor) ? ("estable, " + pctTxt) : (pctTxt + " vs. tu promedio");
  var estadoTxt = peor ? "por encima de" : (mejor ? "por debajo de" : "estable en torno a");
  var aria = esc(label) + " de los últimos " + serie.length + " cortes, " + estadoTxt + " tu promedio histórico";
  return '<div class="spark">' +
    '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="' + aria + '">' +
    '<line x1="0" y1="' + avgY.toFixed(1) + '" x2="' + W + '" y2="' + avgY.toFixed(1) + '" stroke="rgba(232,166,60,.34)" stroke-width="1" stroke-dasharray="3 4"/>' +
    '<path d="' + areaPath + '" fill="' + fill + '"/>' +
    '<polyline points="' + polyline + '" fill="none" stroke="' + stroke + '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.2" fill="' + stroke + '"/>' +
    '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="6" fill="none" stroke="' + stroke + '" stroke-opacity=".3" stroke-width="1"/>' +
    "</svg>" +
    '<div class="spark-cap"><span>' + esc(label) + " " + serie.length + 'c</span><span class="avg">' + esc(capTxt) + "</span></div>" +
    "</div>";
}

// ------------------------------------------------------------ tabla detalle

function renderAdRow(r, columnas, moneda, tipo, diasVentana) {
  var reco = r._reco;
  var sev = RECO_SEV[reco] || "mute";
  var badge = BADGE_V2[reco] || BADGE_V2.WATCH;
  var celdas = columnas.map(function (col) {
    var val, css;
    if (col.campo === "Frecuencia") {
      var valorNum = parseNumero(r[col.campo]);
      var remk = esRemarketing(r["Campaña"], r["Conjunto de anuncios"]);
      var meter = freqMeterHtml(valorNum, tipo, diasVentana, remk);
      val = '<span class="freq"><span class="num">' + (valorNum === null ? '<span class="none">—</span>' : numAR(valorNum, 2)) + "</span>" + meter + "</span>";
      css = ' class="n"';
    } else {
      val = fmtCelda(col.campo, r[col.campo], moneda);
      if (col.flecha) val += deltaHtml(r._cambio);
      css = col.num ? ' class="n num"' : "";
    }
    return "<td" + css + ">" + val + "</td>";
  }).join("");
  var gastoFila = parseNumero(r["Importe gastado"]) || 0;
  var sug = montoSugeridoV2(reco, gastoFila, moneda);
  return '<tr class="adrow r-' + sev + '" tabindex="0">' +
    '<td class="c-ad"><div class="ad-name">' + esc(r["Anuncio"]) + '</div>' +
    '<div class="ad-set">' + esc(r["Conjunto de anuncios"]) + "</div>" +
    adCopyHtml(r) + "</td>" +
    celdas +
    '<td><span class="b ' + badge.cls + '"' + (SUG_HINT[reco] ? "" : "") + '><span class="g">' + badge.icon + "</span>" + esc(reco) + "</span></td>" +
    '<td><p class="motivo">' + formatMotivo(r._motivo) + "</p></td>" +
    '<td class="sug ' + sug.cls + '"><span class="v">' + esc(sug.v) + '</span><span class="h">' + esc(sug.h) + "</span></td>" +
    "</tr>";
}

function renderBloqueTabla(nombreCliente, tipo, filas, moneda, tituloVentana, diasVentana) {
  var columnas = COLUMNAS_POR_TIPO[tipo] || COLUMNAS_POR_TIPO.generico;
  var grupos = [];
  var indice = {};
  filas.forEach(function (r) {
    var camp = r["Campaña"] || "(sin campaña)";
    if (!(camp in indice)) { indice[camp] = grupos.length; grupos.push({ nombre: camp, filas: [] }); }
    grupos[indice[camp]].filas.push(r);
  });
  var colspan = columnas.length + 4;
  var filasHtml = grupos.map(function (g) {
    var gastoGrupo = g.filas.reduce(function (s, r) { return s + (parseNumero(r["Importe gastado"]) || 0); }, 0);
    var grp = '<tr class="grp"><td colspan="' + colspan + '"><span class="grp-inner"><span class="grp-name">' + esc(g.nombre) +
      '</span><span class="grp-meta">' + g.filas.length + " anuncio" + (g.filas.length === 1 ? "" : "s") + " · " + money(gastoGrupo, moneda) + " en la ventana</span></span></td></tr>";
    return grp + g.filas.map(function (r) { return renderAdRow(r, columnas, moneda, tipo, diasVentana); }).join("");
  }).join("");
  var encabezados = columnas.map(function (col) {
    var cls = col.num ? ' class="n"' : "";
    return "<th" + cls + thTooltip(col.etiqueta) + ">" + esc(col.etiqueta) + "</th>";
  }).join("");
  var gastoTotal = filas.reduce(function (s, r) { return s + (parseNumero(r["Importe gastado"]) || 0); }, 0);
  return '<div class="detail-head"><span class="crumb"><b>' + esc(nombreCliente) + '</b><span class="sep">/</span>' +
    esc(ETIQUETA_TIPO[tipo] || tipo) + '<span class="sep">/</span>' + esc(tituloVentana) + "</span></div>" +
    '<div class="scroller" tabindex="0"><table class="tbl"><thead><tr>' +
    '<th class="c-ad">Anuncio · conjunto</th>' + encabezados +
    "<th>Recomendación</th><th>Motivo</th><th>Monto sugerido</th></tr></thead><tbody>" + filasHtml + "</tbody></table></div>" +
    '<p class="foot">' + esc(resumenLocalTxt(filas)) + " · " + money(gastoTotal, moneda) +
    ' en la ventana <span class="hint">Pasá el mouse por una fila para leer el motivo completo; la columna del anuncio queda fija al scrollear.</span></p>';
}

function resumenLocalTxt(filas) {
  var conteo = {};
  filas.forEach(function (r) { conteo[r._reco] = (conteo[r._reco] || 0) + 1; });
  var partes = ORDEN_PRIORIDAD.filter(function (k) { return conteo[k]; }).map(function (k) { return conteo[k] + " " + k; });
  return partes.length ? partes.join(" · ") : "sin anuncios activos con gasto";
}

function renderClienteVentana(p, ventana, tituloVentana, diasVentana) {
  var c = p.cliente;
  var moneda = (p.estado_cuenta || {}).moneda || "ARS";
  if (!ventana || !ventana.filas || !ventana.filas.length) {
    return '<p class="sin-datos">Sin datos cargados para ' + esc(tituloVentana) + ".</p>";
  }
  var grupos = {};
  ventana.filas.forEach(function (r) {
    var tipo = tipoCampania(r["Campaña"] || "", r["Conjunto de anuncios"] || "", c.objetivo);
    (grupos[tipo] = grupos[tipo] || []).push(r);
  });
  return ORDEN_TIPOS.filter(function (t) { return grupos[t]; })
    .map(function (tipo) { return renderBloqueTabla(c.nombre, tipo, grupos[tipo], moneda, tituloVentana, diasVentana); })
    .join('<div style="height:var(--s2)"></div>');
}

// ----------------------------------------------------------- detalle cliente

function renderKpisPorTipo(porTipo, moneda) {
  var tiles = "";
  ORDEN_TIPOS.forEach(function (tipo) {
    var datos = (porTipo || {})[tipo];
    if (!datos || !datos.gasto) return;
    KPI_POR_TIPO[tipo].forEach(function (kpi) {
      var campo = kpi[0], etiqueta = kpi[1], formato = kpi[2];
      var valor = datos[campo];
      if ((valor === null || valor === undefined) && formato === "int_opcional") return;
      tiles += '<div class="stat"><span class="stat-l">' + esc(etiqueta) + " · " + esc(ETIQUETA_TIPO[tipo] || tipo) +
        '</span><span class="stat-v">' + fmtKpi(valor, formato, moneda) + "</span></div>";
    });
  });
  return tiles;
}

function renderClienteGeneral(p) {
  var ec = p.estado_cuenta || {};
  var vDecision = p.v_decision;
  var moneda = ec.moneda || "ARS";
  var merWarn = advertenciaMer(ec, vDecision, moneda);
  var tiles = '<div class="stat"><span class="stat-l">Ventas reales (panel)</span><span class="stat-v">' + money(ec.ventas_reales_ars, "ARS") + "</span></div>" +
    '<div class="stat"><span class="stat-l">Gasto · ' + esc(p.ventana_decision_label) + '</span><span class="stat-v">' +
    (vDecision ? money(vDecision.gasto_total, moneda) : "—") + "</span></div>" +
    renderKpisPorTipo(vDecision ? vDecision.por_tipo : {}, moneda);
  var checks = '<span class="chk ' + (ec.cuenta_activa === false ? "chk-crit" : "chk-good") + '">Cuenta: ' + (ec.cuenta_activa === false ? "PROBLEMA" : "OK") + "</span>" +
    '<span class="chk ' + (ec.metodo_pago_ok === false ? "chk-crit" : "chk-good") + '">Pago: ' + (ec.metodo_pago_ok === false ? "PROBLEMA" : "OK") + "</span>" +
    '<span class="chk">10am: ' + esc(ec.ultima_revision_10am || "sin revisar hoy") + "</span>" +
    '<span class="chk">17h: ' + esc(ec.ultima_revision_17h || "sin revisar hoy") + "</span>" +
    (p.presupuesto_sin_gastar || []).map(function (pr) {
      return '<span class="chk chk-crit">Entrega: ' + esc(pr.conjunto) + " — " + money(pr.gasto, moneda) + " de " + money(pr.presupuesto, moneda) + " hoy</span>";
    }).join("");
  return '<div class="stat-grid">' + tiles + "</div>" +
    '<div class="checks">' + checks + "</div>" +
    (ec.notas ? '<p class="notas">' + esc(ec.notas) + "</p>" : "") +
    (merWarn ? '<p class="notas">' + esc(merWarn) + "</p>" : "") +
    '<p class="resumen-conteo">Ventana de decisión (' + esc(p.ventana_decision_label) + ") — " + esc(resumenConteoTxt(p.v_decision)) + "</p>";
}

// -------------------------------------------------------------- overview

function renderOverviewCard(p) {
  var c = p.cliente;
  var ec = p.estado_cuenta || {};
  var vDecision = p.v_decision;
  var slug = c.slug;
  var moneda = ec.moneda || "ARS";
  var sevWord = SEV_WORD[p.color] || "Sin datos";
  var sevClass = SEV_CLASS[p.color] || "sev-neutral";

  var badgesParts = [];
  if (ec.cuenta_activa === false || ec.metodo_pago_ok === false) {
    badgesParts.push('<span class="b b-crit"><span class="g">!</span>Cuenta</span>');
  }
  if (vDecision) {
    ORDEN_PRIORIDAD.forEach(function (k) {
      var n = vDecision.conteo[k];
      if (!n) return;
      var b = BADGE_V2[k] || BADGE_V2.WATCH;
      badgesParts.push('<span class="b ' + b.cls + '"><span class="g">' + b.icon + '</span><span class="c">' + n + "</span> " + esc(capitalize(k)) + "</span>");
    });
  }
  var badgesHtml = badgesParts.join("");
  if (p.error) badgesHtml = '<span class="b b-crit"><span class="g">!</span>' + esc(p.error) + "</span>";
  else if (!badgesHtml) badgesHtml = '<span class="b b-mute"><span class="g">−</span>sin anuncios activos con gasto</span>';

  var tipos = tiposConGasto(p);
  var objsHtml = tipos.length
    ? tipos.map(function (t) { return '<span class="obj">' + esc(ETIQUETA_TIPO[t] || t) + "</span>"; }).join("")
    : '<span class="obj">sin gasto activo</span>';

  var montoHtml = vDecision ? moneyHtml(vDecision.gasto_total, moneda) : '<span class="none">—</span>';

  return '<a class="card' + (p.color === "critical" ? " is-crit" : "") + '" href="#/c/' + encodeURIComponent(slug) + '" data-color="' + p.color + '">' +
    '<div class="card-top"><span class="card-name">' + esc(c.nombre) + '</span>' +
    '<span class="sev ' + sevClass + '"><span class="sev-meter"><i></i><i></i><i></i></span><span class="sev-word">' + esc(sevWord) + "</span></span></div>" +
    '<div class="objs">' + objsHtml + "</div>" +
    '<div class="amount"><span class="fig">' + montoHtml + '</span>' +
    '<span class="cap">gastado · ventana de decisión <span class="win">' + esc(p.ventana_decision_label) + "</span></span></div>" +
    sparkChart(p) +
    '<div class="badges">' + badgesHtml + "</div>" +
    '<span class="card-go">Ver decisión →</span>' +
    "</a>";
}

function renderLedger(conteo, activos) {
  var segs = [
    { key: "critical", cls: "seg-crit", label: "urgentes" },
    { key: "warning", cls: "seg-warn", label: "para revisar" },
    { key: "good", cls: "seg-good", label: "en orden" },
    { key: "neutral", cls: "seg-neutral", label: "sin datos" },
  ];
  var bar = segs.map(function (s) {
    var n = conteo[s.key];
    if (!n) return "";
    return '<button class="seg ' + s.cls + '" type="button" style="flex:' + n + '" data-color="' + s.key +
      '" aria-label="Ver las ' + n + " cuentas " + s.label + '"></button>';
  }).join("");
  var keys = segs.map(function (s) {
    var n = conteo[s.key];
    if (!n) return "";
    return '<button type="button" class="key key-' + s.key + '" data-color="' + s.key + '"><span class="n">' + n + '</span><span class="l">' + s.label + "</span></button>";
  }).join("");
  return '<div class="ledger"><div class="ledger-bar" id="ledger-bar" role="group" aria-label="Reparto de cuentas por estado">' + bar + "</div>" +
    '<div class="ledger-keys">' + keys + '<span class="key-total">' + activos + " cuenta" + (activos === 1 ? "" : "s") + " con entrega activa</span></div></div>";
}

function renderInsightSemana(procesados, topN) {
  topN = topN || 3;
  var candidatos = [];
  procesados.forEach(function (p) {
    var vDecision = p.v_decision;
    if (!vDecision) return;
    (vDecision.filas || []).forEach(function (r) {
      if (r._reco === "REDUCIR" && r._cambio !== null && r._cambio !== undefined) candidatos.push([p, r]);
    });
  });
  if (!candidatos.length) return "";
  candidatos.sort(function (a, b) { return b[1]._cambio - a[1]._cambio; });
  var tarjetas = candidatos.slice(0, topN).map(function (pr) {
    var p = pr[0], r = pr[1];
    var c = p.cliente;
    var moneda = (p.estado_cuenta || {}).moneda || "ARS";
    var gastoFila = parseNumero(r["Importe gastado"]) || 0;
    var b = BADGE_V2[r._reco] || BADGE_V2.WATCH;
    return '<a class="insight" href="#/c/' + encodeURIComponent(c.slug) + '">' +
      '<div class="insight-top"><span class="insight-name">' + esc(c.nombre) + '</span>' +
      '<span class="b ' + b.cls + '"><span class="g">' + b.icon + "</span>" + esc(r._reco) + "</span></div>" +
      '<div class="insight-ad">' + esc(r["Anuncio"]) + '<span class="insight-spend"> · ' + money(gastoFila, moneda) + "</span></div>" +
      '<p class="insight-motivo">' + formatMotivo(r._motivo) + "</p>" +
      "</a>";
  }).join("");
  return '<section class="section"><div class="section-head"><h2>Insight de la semana</h2><span class="rule"></span>' +
    '<span class="meta">diagnósticos más marcados</span></div><div class="insight-grid">' + tarjetas + "</div></section>";
}

function renderAlertas(procesados) {
  var items = [];
  procesados.forEach(function (p) {
    var ec = p.estado_cuenta || {};
    if (ec.cuenta_activa === false || ec.metodo_pago_ok === false) {
      var problemas = [];
      if (ec.cuenta_activa === false) problemas.push("cuenta inactiva");
      if (ec.metodo_pago_ok === false) problemas.push("método de pago con problema");
      items.push({ p: p, reco: "CUENTA", motivo: ec.notas || ("Cuenta con " + problemas.join(" y ") + " — revisar en Business Manager"), gasto: null });
    }
    var vDecision = p.v_decision;
    if (vDecision) {
      (vDecision.filas || []).forEach(function (r) {
        if (r._reco === "STOP" || r._reco === "REDUCIR") items.push({ p: p, reco: r._reco, motivo: r._motivo, gasto: parseNumero(r["Importe gastado"]) });
      });
    }
    var v1 = p.v1;
    if (v1) {
      (v1.filas || []).forEach(function (r) {
        if (r._reco === "GASTO ALTO") items.push({ p: p, reco: "GASTO ALTO", motivo: r._motivo, gasto: parseNumero(r["Importe gastado"]) });
      });
    }
    var monedaP = ec.moneda || "ARS";
    (p.presupuesto_sin_gastar || []).forEach(function (prob) {
      items.push({
        p: p, reco: "ENTREGA", gasto: prob.gasto,
        motivo: "Presupuesto diario configurado en " + money(prob.presupuesto, monedaP) + " pero solo gastó " + money(prob.gasto, monedaP) +
          " hoy — revisar si el conjunto tiene un problema de entrega en Ads Manager",
      });
    });
    (p.fatiga_campania || []).forEach(function (f) {
      items.push({ p: p, reco: "FATIGA", motivo: f.motivo, gasto: f.gasto });
    });
  });
  if (!items.length) return { html: '<p class="sin-datos">Sin alertas — todo dentro de rango.</p>', count: 0 };
  var prioridad = { CUENTA: 0, STOP: 1, "GASTO ALTO": 2, ENTREGA: 2, FATIGA: 2, REDUCIR: 3 };
  items.sort(function (a, b) {
    var pa = prioridad[a.reco], pb = prioridad[b.reco];
    if (pa !== pb) return pa - pb;
    return (b.gasto || 0) - (a.gasto || 0);
  });

  function alertHtml(it) {
    var badge = BADGE_V2[it.reco] || BADGE_V2.WATCH;
    var c = it.p.cliente;
    var spendTxt = it.gasto ? money(it.gasto, (it.p.estado_cuenta || {}).moneda || "ARS") : "sin cargo registrado";
    return '<a class="alert" href="#/c/' + encodeURIComponent(c.slug) + '">' +
      '<span class="b ' + badge.cls + '"><span class="g">' + badge.icon + "</span>" + esc(it.reco) + "</span>" +
      '<span class="alert-who"><span class="alert-name">' + esc(c.nombre) + '</span><span class="alert-acct">act_' + esc(c.act_id || "") + " · " + esc(c.objetivo || "") + "</span></span>" +
      '<span class="alert-body"><p class="alert-text">' + formatMotivo(it.motivo) + "</p>" +
      '<span class="alert-spend">' + esc(spendTxt) + "</span></span>" +
      '<span class="alert-go">Ver cliente →</span>' +
      "</a>";
  }

  var porCliente = {};
  var ordenClientes = [];
  items.forEach(function (it) {
    var slug = it.p.cliente.slug;
    if (!porCliente[slug]) { porCliente[slug] = { nombre: it.p.cliente.nombre, items: [] }; ordenClientes.push(slug); }
    porCliente[slug].items.push(it);
  });

  var filtros = "";
  if (ordenClientes.length > 1) {
    filtros = '<div class="alert-filtros"><button class="chip" data-alerta-cliente="" aria-pressed="true">Todos ' + items.length + "</button>" +
      ordenClientes.map(function (slug) {
        return '<button class="chip" data-alerta-cliente="' + esc(slug) + '" aria-pressed="false">' + esc(porCliente[slug].nombre) + " " + porCliente[slug].items.length + "</button>";
      }).join("") + "</div>";
  }
  var lista = '<div class="alerts" id="alerts-list">' + items.map(function (it) {
    return '<div data-cliente-slug="' + esc(it.p.cliente.slug) + '">' + alertHtml(it) + "</div>";
  }).join("") + "</div>";
  return { html: filtros + lista, count: items.length };
}

function wireAlertas(container) {
  var filtros = container.querySelector(".alert-filtros");
  if (!filtros) return;
  filtros.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    filtros.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    var slug = btn.dataset.alertaCliente;
    container.querySelectorAll("#alerts-list > [data-cliente-slug]").forEach(function (row) {
      row.style.display = (!slug || row.dataset.clienteSlug === slug) ? "" : "none";
    });
  });
}

// --------------------------------------------------------------- páginas

function renderOverviewPage(procesados, corte) {
  var app = document.getElementById("app");
  var conteo = { critical: 0, warning: 0, good: 0, neutral: 0 };
  procesados.forEach(function (p) { conteo[p.color]++; });
  var activos = procesados.filter(function (p) { return !p.estado_cuenta || p.estado_cuenta.cuenta_activa !== false; }).length;

  function gridHtml(filtroTexto, filtroColor) {
    return procesados.filter(function (p) {
      if (filtroColor && p.color !== filtroColor) return false;
      if (filtroTexto && p.cliente.nombre.toLowerCase().indexOf(filtroTexto.toLowerCase()) === -1) return false;
      return true;
    }).map(renderOverviewCard).join("");
  }

  var alertas = renderAlertas(procesados);
  var insight = renderInsightSemana(procesados);

  app.innerHTML = '<div class="wrap">' +
    '<header class="head"><div class="head-top"><div>' +
    '<p class="eyebrow">Meta Ads · Wave Agencia</p>' +
    '<h1 class="wordmark">Flako<em>Performance</em></h1>' +
    '<p class="tagline">Cada anuncio juzgado contra su propio objetivo y contra su propio historial — no contra un promedio de industria.</p>' +
    "</div>" +
    (corte ? '<div class="stamp"><span class="live">último corte</span><br><b>' + esc(corte) + "</b></div>" : "") +
    "</div>" +
    renderLedger(conteo, activos) +
    "</header>" +
    (alertas.count ? '<section class="section"><div class="section-head"><h2>Necesita acción hoy</h2><span class="rule"></span><span class="meta">' +
      alertas.count + " pendiente" + (alertas.count === 1 ? "" : "s") + "</span></div>" + alertas.html + "</section>" : "") +
    insight +
    '<section class="section"><div class="section-head"><h2>Cuentas</h2><span class="rule"></span><span class="meta">ordenadas por urgencia</span></div>' +
    '<div class="search"><input type="search" id="buscador" placeholder="Buscar cliente…"></div>' +
    '<div class="grid" id="overview-grid">' + gridHtml("", null) + "</div></section>" +
    "</div>";

  wireAlertas(app);

  var input = document.getElementById("buscador");
  var grid = document.getElementById("overview-grid");
  var colorActivo = null;
  input.addEventListener("input", function () { grid.innerHTML = gridHtml(input.value, colorActivo); });

  var ledgerBar = document.getElementById("ledger-bar");
  function aplicarFiltroColor(color) {
    colorActivo = (colorActivo === color) ? null : color;
    if (ledgerBar) {
      ledgerBar.classList.toggle("filtrando", !!colorActivo);
      ledgerBar.querySelectorAll(".seg").forEach(function (s) { s.classList.toggle("seg-activo", s.dataset.color === colorActivo); });
    }
    app.querySelectorAll(".key").forEach(function (k) { k.classList.toggle("activo", k.dataset.color === colorActivo); });
    grid.innerHTML = gridHtml(input.value, colorActivo);
  }
  app.querySelectorAll(".seg,.key").forEach(function (el) {
    el.addEventListener("click", function () { aplicarFiltroColor(el.dataset.color); });
  });
}

function renderClientePage(procesados, slug, tabInicial) {
  var app = document.getElementById("app");
  var p = null;
  for (var i = 0; i < procesados.length; i++) {
    if (procesados[i].cliente.slug === slug) { p = procesados[i]; break; }
  }
  if (!p) {
    app.innerHTML = '<div class="wrap"><a class="back-link" href="#/">← volver al listado</a><p class="error-carga">Cliente "' + esc(slug) + '" no encontrado.</p></div>';
    return;
  }
  var c = p.cliente;
  var sevWord = SEV_WORD[p.color] || "Sin datos";
  var sevClass = SEV_CLASS[p.color] || "sev-neutral";
  var tabsDef = [["general", "General"], ["decision", "Decisión"], ["salud", "Salud técnica"]];
  var ids = tabsDef.map(function (t) { return t[0]; });
  var activo = ids.indexOf(tabInicial) !== -1 ? tabInicial : "general";
  var paneles = {
    general: renderClienteGeneral(p),
    decision: '<p class="pagina-intro">Una sola ventana por cliente, la que mejor calza con su ciclo real de decisión (3 o 7 días, configurable en <code>clientes.json</code>) — esta es la tabla que define si un anuncio se pausa, se reduce o se escala.</p>' +
      renderClienteVentana(p, p.v_decision, p.ventana_decision_label, p.ventana_decision_dias),
    salud: '<p class="pagina-intro">Chequeo diario de que nada esté técnicamente roto — gasto atípico de hoy y presupuesto configurado que no se está gastando (probable problema de entrega). No es una tabla de rendimiento.</p>' +
      renderClienteVentana(p, p.v1, "salud técnica — hoy", null),
  };
  app.innerHTML = '<div class="wrap">' +
    '<a class="back-link" href="#/">← volver al listado</a>' +
    '<div class="client-head"><span class="sev ' + sevClass + '"><span class="sev-meter"><i></i><i></i><i></i></span><span class="sev-word">' + esc(sevWord) + '</span></span><h1>' + esc(c.nombre) + "</h1></div>" +
    '<div class="chip-group">' + tabsDef.map(function (t) {
      return '<button type="button" class="chip" data-tab="' + t[0] + '" aria-pressed="' + (t[0] === activo ? "true" : "false") + '">' + esc(t[1]) + "</button>";
    }).join("") + "</div>" +
    tabsDef.map(function (t) {
      return '<div class="panel' + (t[0] === activo ? " activa" : "") + '" data-panel="' + t[0] + '">' + paneles[t[0]] + "</div>";
    }).join("") +
    "</div>";

  app.querySelectorAll(".chip-group [data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      location.hash = "#/c/" + encodeURIComponent(slug) + "/" + btn.dataset.tab;
    });
  });
}

// --------------------------------------------------------------- router

var DATA = null;

function parseHash() {
  var h = location.hash || "#/";
  var m = h.match(/^#\/c\/([^\/]+)(?:\/([a-z]+))?$/);
  if (m) return { route: "cliente", slug: decodeURIComponent(m[1]), tab: m[2] || "general" };
  return { route: "overview" };
}

function render() {
  if (!DATA) return;
  var ruta = parseHash();
  if (ruta.route === "cliente") {
    renderClientePage(DATA.clientes, ruta.slug, ruta.tab);
  } else {
    renderOverviewPage(DATA.clientes, DATA.corte);
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

fetch("./sitio_datos.json")
  .then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then(function (d) {
    DATA = d;
    render();
  })
  .catch(function (err) {
    document.getElementById("app").innerHTML = '<div class="wrap"><p class="error-carga">No se pudieron cargar los datos (' +
      esc(err.message) + ").  Probá recargar la página.</p></div>";
  });
