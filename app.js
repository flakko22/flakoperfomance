"use strict";
/*
 * FlakoPerformance — front-end. Lee sitio_datos.json (generado por
 * generar_datos_sitio.py, que reusa el cómputo de generar_dashboard.py tal
 * cual) y renderiza en el navegador. Ninguna lógica de negocio nueva acá:
 * todo lo que sigue son los mismos lookups de formato/color/columnas que
 * ya vivían en generar_dashboard.py, portados de Python a JS porque ahora
 * el render pasa a ser client-side (permite URL por cliente en vez de un
 * solo HTML gigante con las 3 páginas de todos los clientes apiladas).
 */

// --------------------------------------------------------------- constantes

var UMBRAL_CAMBIO = 0.20;
var UMBRAL_DIVERGENCIA_MER = 0.30;

var BADGE_CLASS = {
  "PUSH": "badge-good", "REDUCIR": "badge-warning", "STOP": "badge-critical",
  "GASTO ALTO": "badge-warning", "ENTREGA": "badge-warning", "FATIGA": "badge-warning",
  "CUENTA": "badge-critical", "WATCH": "badge-muted", "EN APRENDIZAJE": "badge-info",
  "EXCLUIR": "badge-off",
};
var BADGE_ICON = {
  "PUSH": "↗", "REDUCIR": "↘", "STOP": "✕", "GASTO ALTO": "⚠", "ENTREGA": "◐",
  "FATIGA": "⟳", "CUENTA": "⛔", "WATCH": "○", "EN APRENDIZAJE": "◐", "EXCLUIR": "–",
};
var BADGE_TOOLTIP = {
  "PUSH": "Está rindiendo por encima de lo esperado — candidato a subir presupuesto gradual",
  "REDUCIR": "Está rindiendo por debajo de lo esperado — candidato a bajar presupuesto o pausar",
  "STOP": "Gastó sin resultados por encima del límite configurado — candidato a pausar ya",
  "GASTO ALTO": "Salud técnica: gastó mucho más de lo habitual en el día — revisar presupuesto o puja (no es un veredicto de rendimiento)",
  "ENTREGA": "Salud técnica: presupuesto configurado pero gastando muy por debajo — probable problema de entrega, revisar en Ads Manager",
  "FATIGA": "Salud técnica: la frecuencia agregada de TODA la campaña (todos los anuncios combinados) superó el techo sano — la audiencia ya vio el conjunto demasiadas veces aunque cada anuncio individual se vea bien. Refrescar creatividad o ampliar público",
  "CUENTA": "Problema a nivel de toda la cuenta (pago o cuenta inactiva) — revisar en Business Manager",
  "WATCH": "Sin acción recomendada por ahora — seguir monitoreando",
  "EN APRENDIZAJE": "Meta todavía está optimizando la entrega — no evaluar ni tocar presupuesto todavía",
  "EXCLUIR": "No está corriendo actualmente (pausado o sin gasto) — no se evalúa",
};
var FILA_CLASS = {
  "STOP": "fila-stop", "CUENTA": "fila-stop", "GASTO ALTO": "fila-reducir",
  "ENTREGA": "fila-reducir", "FATIGA": "fila-reducir", "REDUCIR": "fila-reducir",
};
var COLOR_LABEL = {
  good: "Todo en orden", warning: "Revisar", critical: "Atención urgente", neutral: "Sin datos cargados",
};
var COLOR_ICON = { good: "✓", warning: "!", critical: "✕", neutral: "–" };

var ORDEN_PRIORIDAD = ["STOP", "GASTO ALTO", "REDUCIR", "PUSH", "WATCH", "EN APRENDIZAJE", "EXCLUIR"];
var ORDEN_TIPOS = ["ventas", "leads", "mensajes", "trafico", "reconocimiento", "perfil", "generico"];

var ETIQUETA_TIPO = {
  ventas: "ventas", leads: "leads/formularios", mensajes: "mensajes/WhatsApp",
  trafico: "tráfico", reconocimiento: "reconocimiento/alcance", perfil: "visitas a perfil",
  generico: "sin clasificar",
};

var KPI_POR_TIPO = {
  ventas: [["compras", "Compras", "int"], ["roas_ponderado", "ROAS ponderado (ventas)", "roas"]],
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

var METRICA_TITULAR = [
  ["ventas", "roas_ponderado", "roas", "ROAS"],
  ["mensajes", "costo_promedio", "money", "Costo/msj"],
  ["reconocimiento", "seguidores", "int_opcional", "Seguidores"],
  ["reconocimiento", "alcance", "int", "Alcance"],
  ["trafico", "costo_promedio", "money", "Costo/visita"],
  ["perfil", "costo_promedio", "money", "Costo/visita perfil"],
  ["generico", "costo_promedio", "money", "Costo/res."],
];

var CAMPOS_ENTEROS = new Set(["Resultados", "Alcance", "Compras", "Seguidores"]);
var CAMPOS_MONEDA = new Set(["Costo por resultado", "Importe gastado"]);
var OBJETIVO_A_TIPO_FALLBACK = { ventas: "ventas", mensajes: "mensajes", leads: "leads" };

// ------------------------------------------------------------------ helpers

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function capitalize(s) {
  // Replica Python str.capitalize(): mayúscula el primer carácter, minúscula el resto.
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

function money(v, moneda) {
  moneda = moneda || "ARS";
  if (v === null || v === undefined) return "—";
  return moneda + " $" + Math.round(v).toLocaleString("en-US");
}

function fmtKpi(valor, formato, moneda) {
  if (valor === null || valor === undefined) return "—";
  if (formato === "int" || formato === "int_opcional") return Math.round(valor).toLocaleString("en-US");
  if (formato === "money") return money(valor, moneda);
  if (formato === "roas") return valor.toFixed(2) + "x";
  return String(valor);
}

function fmtCelda(campo, valorCrudo, moneda) {
  var valor = parseNumero(valorCrudo);
  if (valor === null) return "";
  if (CAMPOS_ENTEROS.has(campo)) return Math.round(valor).toLocaleString("en-US");
  if (CAMPOS_MONEDA.has(campo)) return money(valor, moneda);
  if (campo === "ROAS de compras") return valor.toFixed(2) + "x";
  if (campo === "CTR") return valor.toFixed(2) + "%";
  if (campo === "Frecuencia") return valor.toFixed(2);
  return esc(valorCrudo);
}

function badgeTitle(reco) {
  var tip = BADGE_TOOLTIP[reco];
  return tip ? ' title="' + esc(tip) + '"' : "";
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

function flechaTendencia(cambio) {
  if (cambio === null || cambio === undefined) return "";
  if (cambio >= UMBRAL_CAMBIO) return '<span class="delta delta-bad">▲</span>';
  if (cambio <= -UMBRAL_CAMBIO) return '<span class="delta delta-good">▼</span>';
  return '<span class="delta delta-flat">→</span>';
}

function montoSugerido(reco, gasto, moneda) {
  if (!gasto) return "—";
  if (reco === "REDUCIR") return "-" + money(gasto * 0.25, moneda) + " (~-25% del gasto de la ventana)";
  if (reco === "PUSH") return "+" + money(gasto * 0.25, moneda) + " (~+20-30%, escalar gradual)";
  if (reco === "STOP") return moneda + " $0 — pausar";
  if (reco === "GASTO ALTO") return "Revisar presupuesto/puja hoy";
  return "—";
}

function textoAnuncioHtml(r, maxLen) {
  maxLen = maxLen || 70;
  var texto = (r["Texto anuncio"] || "").trim();
  if (!texto) return "";
  var corto = texto.length <= maxLen ? texto : texto.slice(0, maxLen).replace(/\s+$/, "") + "…";
  return '<div class="anuncio-texto">' + esc(corto) + "</div>";
}

function sparklineSvg(valores, moneda) {
  var puntos = (valores || []).filter(function (v) { return v !== null && v !== undefined; });
  if (puntos.length < 2) return "";
  var W = 72, H = 24, PAD = 3;
  var minimo = Math.min.apply(null, puntos), maximo = Math.max.apply(null, puntos);
  var rango = maximo - minimo;
  var anchoUtil = W - 2 * PAD, altoUtil = H - 2 * PAD;
  var coords = puntos.map(function (v, i) {
    var x = PAD + (anchoUtil * i / (puntos.length - 1));
    var y = rango === 0 ? PAD + altoUtil / 2 : PAD + altoUtil * (1 - (v - minimo) / rango);
    return [x, y];
  });
  var polyline = coords.map(function (xy) { return xy[0].toFixed(1) + "," + xy[1].toFixed(1); }).join(" ");
  var ultimo = coords[coords.length - 1];
  var titulo = "Gasto por corte: " + money(puntos[0], moneda) + " → " + money(puntos[puntos.length - 1], moneda) +
    " (últimos " + puntos.length + " cortes)";
  return '<svg class="sparkline" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img">' +
    "<title>" + esc(titulo) + "</title>" +
    '<polyline points="' + polyline + '" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
    '<circle cx="' + ultimo[0].toFixed(1) + '" cy="' + ultimo[1].toFixed(1) + '" r="2.5" fill="var(--accent)" />' +
    "</svg>";
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

function objetivoChipsHtml(p) {
  var tipos = tiposConGasto(p);
  if (!tipos.length) return '<span class="obj-chip obj-chip-muted">sin gasto activo</span>';
  return tipos.map(function (t) { return '<span class="obj-chip">' + esc(ETIQUETA_TIPO[t] || t) + "</span>"; }).join("");
}

function metricasTitularesHtml(porTipo, moneda) {
  var chips = [];
  var vistos = new Set();
  for (var i = 0; i < METRICA_TITULAR.length && chips.length < 3; i++) {
    var tipo = METRICA_TITULAR[i][0], campo = METRICA_TITULAR[i][1], formato = METRICA_TITULAR[i][2], etiqueta = METRICA_TITULAR[i][3];
    if (vistos.has(tipo)) continue;
    var datos = (porTipo || {})[tipo];
    if (!datos || !datos.gasto) continue;
    var valor = datos[campo];
    if (valor === null || valor === undefined) continue;
    vistos.add(tipo);
    var txt = fmtKpi(valor, formato, moneda);
    if (campo === "seguidores") txt = "+" + txt;
    chips.push('<span class="metric-chip">' + esc(etiqueta) + " " + esc(txt) + "</span>");
  }
  return chips.join("");
}

function resumenBadgesHtml(ventana) {
  if (!ventana) return "";
  var partes = [];
  ORDEN_PRIORIDAD.forEach(function (k) {
    var n = (ventana.conteo || {})[k];
    if (n) partes.push('<span class="mini-badge ' + (BADGE_CLASS[k] || "badge-muted") + '"' + badgeTitle(k) + ">" + (BADGE_ICON[k] || "") + " " + n + "</span>");
  });
  return partes.join("");
}

function advertenciaMer(estadoCuenta, ventana, moneda) {
  var ventasReales = estadoCuenta.ventas_reales_ars;
  if (ventasReales === null || ventasReales === undefined || !ventana || !ventana.gasto_total || moneda !== "ARS") return null;
  var roasMeta = ventana.roas_ponderado;
  if (!roasMeta) return null;
  var merReal = ventasReales / ventana.gasto_total;
  var divergencia = Math.abs(merReal - roasMeta) / roasMeta;
  if (divergencia < UMBRAL_DIVERGENCIA_MER) return null;
  return "⚠ Meta dice que estás facturando " + roasMeta.toFixed(2) + " por cada $1 invertido (ROAS), pero según la venta real que cargaste (" +
    money(ventasReales, "ARS") + ") contra el gasto (" + money(ventana.gasto_total, moneda) + ") en realidad estás facturando " +
    merReal.toFixed(2) + " por cada $1 (tu MER real) — una diferencia de ~" + (divergencia * 100).toFixed(0) +
    "%. La plataforma puede estar sobreestimando, no uses el ROAS de Meta como única referencia para escalar presupuesto";
}

function resumenConteoTxt(ventana) {
  if (!ventana) return "sin datos";
  var partes = ORDEN_PRIORIDAD.filter(function (k) { return ventana.conteo[k] > 0; })
    .map(function (k) { return ventana.conteo[k] + " " + k; });
  return partes.length ? partes.join(" · ") : "sin anuncios activos con gasto";
}

// ------------------------------------------------------------ tabla detalle

function renderGrupoTabla(tipo, filasGrupo, moneda) {
  var columnas = COLUMNAS_POR_TIPO[tipo] || COLUMNAS_POR_TIPO.generico;
  var filasHtml = filasGrupo.map(function (r) {
    var badge = BADGE_CLASS[r._reco] || "badge-muted";
    var icono = BADGE_ICON[r._reco] || "";
    var filaCss = FILA_CLASS[r._reco] || "";
    var flecha = flechaTendencia(r._cambio);
    var celdas = columnas.map(function (col) {
      var valorTxt = fmtCelda(col.campo, r[col.campo], moneda);
      if (col.flecha) valorTxt = valorTxt + " " + flecha;
      var css = col.num ? ' class="num"' : "";
      return "<td" + css + ' data-label="' + esc(col.etiqueta) + '">' + valorTxt + "</td>";
    }).join("");
    var gastoFila = parseNumero(r["Importe gastado"]) || 0.0;
    var trCss = filaCss ? ' class="' + filaCss + '"' : "";
    return "\n      <tr" + trCss + ">" +
      '<td data-label="Campaña">' + esc(r["Campaña"]) + "</td>" +
      '<td data-label="Conjunto">' + esc(r["Conjunto de anuncios"]) + "</td>" +
      '<td data-label="Anuncio">' + esc(r["Anuncio"]) + textoAnuncioHtml(r) + "</td>" +
      celdas +
      '<td data-label="Recomendación"><span class="badge ' + badge + '"' + badgeTitle(r._reco) + ">" + icono + " " + esc(r._reco) + "</span></td>" +
      '<td class="motivo" data-label="Motivo">' + esc(r._motivo) + "</td>" +
      '<td class="monto" data-label="Monto sugerido">' + montoSugerido(r._reco, gastoFila, moneda) + "</td>" +
      "</tr>";
  }).join("");
  var encabezados = columnas.map(function (col) {
    var cls = col.num ? ' class="num"' : "";
    return "<th" + cls + thTooltip(col.etiqueta) + ">" + esc(col.etiqueta) + "</th>";
  }).join("");
  var gastoGrupo = filasGrupo.reduce(function (s, r) { return s + (parseNumero(r["Importe gastado"]) || 0); }, 0);
  var tituloGrupo = ETIQUETA_TIPO[tipo] || tipo;
  return '\n    <h4 class="subtitulo-grupo">' + esc(capitalize(tituloGrupo)) + ' <span class="grupo-gasto">· ' + money(gastoGrupo, moneda) + "</span></h4>" +
    '\n    <div class="tabla-scroll">' +
    '\n    <table class="tabla-anuncios">' +
    "\n      <thead>\n        <tr>" +
    "\n          <th>Campaña</th><th>Conjunto</th><th>Anuncio</th>\n          " + encabezados +
    "\n          <th>Recomendación</th><th>Motivo</th><th>Monto sugerido</th>" +
    "\n        </tr>\n      </thead>" +
    "\n      <tbody>" + filasHtml + "</tbody>" +
    "\n    </table>\n    </div>";
}

function renderTabla(ventana, titulo, objetivoCliente, moneda) {
  if (!ventana || !ventana.filas || !ventana.filas.length) {
    return '<p class="sin-datos">Sin datos cargados para la ventana de ' + esc(titulo) + ".</p>";
  }
  var grupos = {};
  ventana.filas.forEach(function (r) {
    var tipo = tipoCampania(r["Campaña"] || "", r["Conjunto de anuncios"] || "", objetivoCliente);
    (grupos[tipo] = grupos[tipo] || []).push(r);
  });
  return ORDEN_TIPOS.filter(function (t) { return grupos[t]; })
    .map(function (t) { return renderGrupoTabla(t, grupos[t], moneda); }).join("");
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
      tiles += '<div class="stat-tile"><span class="stat-label">' + esc(etiqueta) + " · " + esc(ETIQUETA_TIPO[tipo] || tipo) +
        ' (7d)</span><span class="stat-value">' + fmtKpi(valor, formato, moneda) + "</span></div>";
    });
  });
  return tiles;
}

function renderClienteGeneral(p) {
  var c = p.cliente;
  var ec = p.estado_cuenta || {};
  var vDecision = p.v_decision;
  var moneda = ec.moneda || "ARS";
  var merWarn = advertenciaMer(ec, vDecision, moneda);
  var checkCuenta = ec.cuenta_activa === false ? "PROBLEMA" : "OK";
  var checkPago = ec.metodo_pago_ok === false ? "PROBLEMA" : "OK";
  var claseCuenta = ec.cuenta_activa === false ? "chip-critical" : "chip-good";
  var clasePago = ec.metodo_pago_ok === false ? "chip-critical" : "chip-good";
  var rev10 = ec.ultima_revision_10am || "sin revisar hoy";
  var rev17 = ec.ultima_revision_17h || "sin revisar hoy";
  var kpisTipo = renderKpisPorTipo(vDecision ? vDecision.por_tipo : {}, moneda);
  var entregaChips = (p.presupuesto_sin_gastar || []).map(function (pr) {
    return '<span class="chip chip-critical">Entrega: ' + esc(pr.conjunto) + " activo, " + money(pr.gasto, moneda) +
      " de " + money(pr.presupuesto, moneda) + " hoy</span>";
  }).join("");
  return '\n    <div class="stat-grid">' +
    '\n      <div class="stat-tile"><span class="stat-label">Ventas reales (panel)</span><span class="stat-value">' + money(ec.ventas_reales_ars, "ARS") + "</span></div>" +
    '\n      <div class="stat-tile"><span class="stat-label">Gasto — decisión (' + esc(p.ventana_decision_label) + ')</span><span class="stat-value">' +
    (vDecision ? money(vDecision.gasto_total, moneda) : "—") + "</span></div>" +
    "\n      " + kpisTipo +
    "\n    </div>" +
    '\n    <div class="check-diario">' +
    '\n      <span class="chip ' + claseCuenta + '">Cuenta: ' + checkCuenta + "</span>" +
    '\n      <span class="chip ' + clasePago + '">Pago: ' + checkPago + "</span>" +
    '\n      <span class="chip chip-muted">10am: ' + esc(rev10) + "</span>" +
    '\n      <span class="chip chip-muted">17h: ' + esc(rev17) + "</span>" +
    "\n      " + entregaChips +
    "\n    </div>" +
    (ec.notas ? '\n    <p class="notas">Notas: ' + esc(ec.notas) + "</p>" : "") +
    (merWarn ? '\n    <p class="notas">' + esc(merWarn) + "</p>" : "") +
    '\n    <p class="resumen-conteo">Ventana de decisión (' + esc(p.ventana_decision_label) + ") — " + esc(resumenConteoTxt(p.v_decision)) + "</p>" +
    '\n    <p class="ver-detalle-hint">Detalle anuncio por anuncio en <strong>Decisión</strong> / salud técnica del día en <strong>Salud técnica</strong> (arriba).</p>';
}

function renderClienteVentana(p, ventana, tituloVentana) {
  var c = p.cliente;
  var moneda = (p.estado_cuenta || {}).moneda || "ARS";
  return renderTabla(ventana, tituloVentana, c.objetivo, moneda);
}

// -------------------------------------------------------------- overview

function renderOverviewCard(p) {
  var c = p.cliente;
  var vDecision = p.v_decision;
  var slug = c.slug;
  var moneda = (p.estado_cuenta || {}).moneda || "ARS";
  var gastoTxt = vDecision ? money(vDecision.gasto_total, moneda) : "—";
  var sparkline = sparklineSvg(p.sparkline_gasto || [], moneda);
  var badges = resumenBadgesHtml(vDecision);
  if (p.error) {
    badges = '<span class="mini-badge badge-critical">⚠ ' + esc(p.error) + "</span>";
  } else if (!badges) {
    badges = '<span class="mini-badge badge-off">sin anuncios activos con gasto</span>';
  }
  var metricas = vDecision ? metricasTitularesHtml(vDecision.por_tipo, moneda) : "";
  var revisadoHoy = p.revisado_10am || p.revisado_17h;
  var checkTxt = revisadoHoy ? "revisado hoy" : "sin revisar hoy";
  var checkClase = revisadoHoy ? "card-check-ok" : "card-check-pendiente";
  return '\n    <a class="card card-' + p.color + '" href="#/c/' + encodeURIComponent(slug) + '" data-slug="' + esc(slug) + '">' +
    '\n      <div class="card-top">' +
    '\n        <span class="dot dot-' + p.color + '"></span>' +
    '\n        <span class="card-nombre">' + esc(c.nombre) + "</span>" +
    "\n      </div>" +
    '\n      <div class="card-chips">' + objetivoChipsHtml(p) + "</div>" +
    '\n      <div class="card-gasto-row">' +
    '\n        <div class="card-gasto">' + gastoTxt + '<span class="card-gasto-label">gastado · decisión ' + esc(p.ventana_decision_label) + "</span></div>" +
    "\n        " + sparkline +
    "\n      </div>" +
    '\n      <div class="card-badges">' + badges + "</div>" +
    (metricas ? '\n      <div class="card-metricas">' + metricas + "</div>" : "") +
    '\n      <div class="card-footer">' +
    '\n        <span class="card-estado">' + COLOR_ICON[p.color] + " " + COLOR_LABEL[p.color] + "</span>" +
    '\n        <span class="card-check ' + checkClase + '">' + checkTxt + "</span>" +
    "\n      </div>" +
    "\n    </a>";
}

function renderResumenEstado(procesados) {
  var conteo = { critical: 0, warning: 0, good: 0, neutral: 0 };
  procesados.forEach(function (p) { conteo[p.color]++; });
  var pills = [];
  if (conteo.critical) pills.push('<span class="resumen-pill resumen-pill-critical"><span class="dot dot-critical"></span>' + conteo.critical + " urgente(s)</span>");
  if (conteo.warning) pills.push('<span class="resumen-pill resumen-pill-warning"><span class="dot dot-warning"></span>' + conteo.warning + " para revisar</span>");
  if (conteo.good) pills.push('<span class="resumen-pill resumen-pill-good"><span class="dot dot-good"></span>' + conteo.good + " en orden</span>");
  if (conteo.neutral) pills.push('<span class="resumen-pill"><span class="dot dot-neutral"></span>' + conteo.neutral + " sin datos</span>");
  return pills.length ? '<div class="resumen-estado">' + pills.join("") + "</div>" : "";
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
    var gastoFila = parseNumero(r["Importe gastado"]) || 0.0;
    return '\n      <a class="insight-card" href="#/c/' + encodeURIComponent(c.slug) + '">' +
      '\n        <div class="insight-top">' +
      '\n          <span class="insight-cliente">' + esc(c.nombre) + "</span>" +
      '\n          <span class="badge ' + (BADGE_CLASS[r._reco] || "badge-muted") + '"' + badgeTitle(r._reco) + ">" + (BADGE_ICON[r._reco] || "") + " " + esc(r._reco) + "</span>" +
      "\n        </div>" +
      '\n        <div class="insight-anuncio">' + esc(r["Anuncio"]) + '<span class="insight-gasto"> · ' + money(gastoFila, moneda) + ' gastados</span></div>' +
      '\n        <p class="insight-motivo">' + esc(r._motivo) + "</p>" +
      "\n      </a>";
  }).join("");
  return '\n    <section class="insight-semana">' +
    '\n      <h2 class="titulo-seccion">Insight de la semana <span class="titulo-seccion-sub">· los diagnósticos más marcados de todos los clientes (ventana de decisión de cada uno)</span></h2>' +
    '\n      <div class="insight-grid">' + tarjetas + "</div>" +
    "\n    </section>";
}

function renderAlertasGlobales(procesados) {
  var items = [];
  procesados.forEach(function (p) {
    var ec = p.estado_cuenta || {};
    if (ec.cuenta_activa === false || ec.metodo_pago_ok === false) {
      var problemas = [];
      if (ec.cuenta_activa === false) problemas.push("cuenta inactiva");
      if (ec.metodo_pago_ok === false) problemas.push("método de pago con problema");
      items.push([p, {
        "Campaña": "Toda la cuenta", "Conjunto de anuncios": "—", "Anuncio": "—",
        "Importe gastado": null, "_reco": "CUENTA",
        "_motivo": ec.notas || ("Cuenta con " + problemas.join(" y ") + " — revisar en Business Manager"),
      }, "cuenta"]);
    }
    var vDecision = p.v_decision;
    if (vDecision) {
      (vDecision.filas || []).forEach(function (r) {
        if (r._reco === "STOP" || r._reco === "REDUCIR") items.push([p, r, p.ventana_decision_label]);
      });
    }
    var v1 = p.v1;
    if (v1) {
      (v1.filas || []).forEach(function (r) {
        if (r._reco === "GASTO ALTO") items.push([p, r, "salud técnica · hoy"]);
      });
    }
    var monedaP = ec.moneda || "ARS";
    (p.presupuesto_sin_gastar || []).forEach(function (prob) {
      items.push([p, {
        "Campaña": prob.campania, "Conjunto de anuncios": prob.conjunto, "Anuncio": "(conjunto completo)",
        "Importe gastado": prob.gasto, "_reco": "ENTREGA",
        "_motivo": "Presupuesto diario configurado en " + money(prob.presupuesto, monedaP) + " pero solo gastó " +
          money(prob.gasto, monedaP) + " hoy — revisar si el conjunto tiene un problema de entrega en Ads Manager",
      }, "salud técnica · hoy"]);
    });
    (p.fatiga_campania || []).forEach(function (f) {
      items.push([p, {
        "Campaña": f.campania, "Conjunto de anuncios": "(todos)", "Anuncio": "(campaña completa)",
        "Importe gastado": f.gasto, "_reco": "FATIGA", "_motivo": f.motivo,
      }, "salud técnica · fatiga campaña (" + p.ventana_decision_label + ")"]);
    });
  });
  if (!items.length) return '<p class="sin-datos">Sin alertas — todo dentro de rango.</p>';
  var prioridad = { "CUENTA": 0, "STOP": 1, "GASTO ALTO": 2, "ENTREGA": 2, "FATIGA": 2, "REDUCIR": 3 };
  items.sort(function (a, b) {
    var pa = prioridad[a[1]._reco], pb = prioridad[b[1]._reco];
    if (pa !== pb) return pa - pb;
    return (parseNumero(b[1]["Importe gastado"]) || 0) - (parseNumero(a[1]["Importe gastado"]) || 0);
  });

  function filaHtml(p, r, ventanaTxt) {
    var c = p.cliente;
    var moneda = (p.estado_cuenta || {}).moneda || "ARS";
    var badge = BADGE_CLASS[r._reco] || "badge-muted";
    var icono = BADGE_ICON[r._reco] || "";
    var filaCss = FILA_CLASS[r._reco] || "";
    var gastoFila = parseNumero(r["Importe gastado"]) || 0.0;
    var trCss = filaCss ? ' class="' + filaCss + '"' : "";
    return "\n        <tr" + trCss + ">" +
      '<td data-label="Cliente"><a class="alerta-cliente-link" href="#/c/' + encodeURIComponent(c.slug) + '">' + esc(c.nombre) + "</a></td>" +
      '<td data-label="Campaña">' + esc(r["Campaña"]) + "</td>" +
      '<td data-label="Conjunto">' + esc(r["Conjunto de anuncios"]) + "</td>" +
      '<td data-label="Anuncio">' + esc(r["Anuncio"]) + textoAnuncioHtml(r) + "</td>" +
      '<td data-label="Recomendación"><span class="badge ' + badge + '"' + badgeTitle(r._reco) + ">" + icono + " " + esc(r._reco) + "</span></td>" +
      '<td data-label="Ventana">' + esc(ventanaTxt) + "</td>" +
      '<td class="motivo" data-label="Motivo">' + esc(r._motivo) + "</td>" +
      '<td class="monto" data-label="Monto sugerido">' + montoSugerido(r._reco, gastoFila, moneda) + "</td>" +
      "</tr>";
  }
  function tablaHtml(filasHtmlArr) {
    return '\n      <div class="tabla-scroll">' +
      '\n      <table class="tabla-anuncios tabla-alertas">' +
      "\n        <thead>\n          <tr>" +
      "\n            <th>Cliente</th><th>Campaña</th><th>Conjunto</th><th>Anuncio</th>" +
      "\n            <th>Recomendación</th><th>Ventana</th><th>Motivo</th><th>Monto sugerido</th>" +
      "\n          </tr>\n        </thead>" +
      "\n        <tbody>" + filasHtmlArr.join("") + "</tbody>" +
      "\n      </table>\n      </div>";
  }

  var porCliente = new Map();
  items.forEach(function (it) {
    var p = it[0], r = it[1], vt = it[2];
    var slug = p.cliente.slug;
    if (!porCliente.has(slug)) porCliente.set(slug, { nombre: p.cliente.nombre, filas: [] });
    porCliente.get(slug).filas.push(filaHtml(p, r, vt));
  });

  if (porCliente.size <= 1) {
    return tablaHtml(porCliente.values().next().value.filas);
  }

  var tabs = [["todos", 'Todos <span class="tab-count">' + items.length + "</span>", null]];
  porCliente.forEach(function (grupo, slug) {
    tabs.push([slug, esc(grupo.nombre) + ' <span class="tab-count">' + grupo.filas.length + "</span>", grupo.filas]);
  });
  var resumenHtml = "";
  porCliente.forEach(function (grupo, slug) {
    resumenHtml += '<button type="button" class="alertas-resumen-pill" data-alertas-tab="' + esc(slug) + '">' +
      esc(grupo.nombre) + ' <span class="tab-count">' + grupo.filas.length + "</span></button>";
  });
  var nav = tabs.map(function (t, i) {
    return '<button type="button" data-alertas-tab="' + esc(t[0]) + '" class="' + (i === 0 ? "activa" : "") + '">' + t[1] + "</button>";
  }).join("");
  var panels = tabs.map(function (t, i) {
    var tid = t[0], filas = t[2];
    var contenido = filas === null ? '<div class="alertas-resumen">' + resumenHtml + "</div>" : tablaHtml(filas);
    return '<div class="alertas-tab-panel' + (i === 0 ? " activa" : "") + '" data-alertas-panel="' + esc(tid) + '">' + contenido + "</div>";
  }).join("");

  return '\n    <div class="alertas-tabs">' +
    '\n      <nav class="alertas-tabs-nav">' + nav + "</nav>" +
    "\n      " + panels +
    "\n    </div>";
}

function wireAlertasTabs(container) {
  var tabsBlock = container.querySelector(".alertas-tabs");
  if (!tabsBlock) return;
  tabsBlock.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-alertas-tab]");
    if (!btn) return;
    var tid = btn.dataset.alertasTab;
    tabsBlock.querySelectorAll(".alertas-tabs-nav button").forEach(function (b) {
      b.classList.toggle("activa", b.dataset.alertasTab === tid);
    });
    tabsBlock.querySelectorAll(".alertas-tab-panel").forEach(function (pnl) {
      pnl.classList.toggle("activa", pnl.dataset.alertasPanel === tid);
    });
  });
}

// --------------------------------------------------------------- páginas

function renderOverviewPage(procesados, corte) {
  var app = document.getElementById("app");
  function gridHtml(filtro) {
    return procesados
      .filter(function (p) { return !filtro || p.cliente.nombre.toLowerCase().indexOf(filtro.toLowerCase()) !== -1; })
      .map(renderOverviewCard).join("");
  }
  app.innerHTML = '\n    <header class="top">' +
    '\n      <div class="top-marca">' +
    '\n        <p class="eyebrow">Meta Ads · seguimiento diario</p>' +
    (corte ? '\n        <p class="top-actualizado">Último corte de datos: ' + esc(corte) + "</p>" : "") +
    "\n      </div>" +
    "\n      <h1>FlakoPerformance</h1>" +
    '\n      <p class="top-desc">Cada campaña se juzga con la métrica de su objetivo real (ventas→ROAS, mensajes/tráfico/reconocimiento→costo por resultado) contra su meta si la definiste, o contra sí misma si no — ▲ rojo = empeoró, ▼ verde = mejoró, → gris = estable. Cuando empeora, cruza frecuencia + alcance para decirte si es fatiga de creativo, audiencia saturada o presión de subasta.</p>' +
    "\n    </header>" +
    renderResumenEstado(procesados) +
    renderInsightSemana(procesados) +
    '\n    <section class="alertas-globales">' +
    '\n      <h2 class="titulo-seccion">Necesita acción hoy <span class="titulo-seccion-sub">· problemas de cuenta/pago, anuncios en STOP o REDUCIR (ventana de decisión de cada cliente) y salud técnica del día, de todos los clientes</span></h2>' +
    "\n      " + renderAlertasGlobales(procesados) +
    "\n    </section>" +
    '\n    <div class="busqueda-bar"><input type="search" id="buscador" placeholder="Buscar cliente…"></div>' +
    '\n    <section class="overview" id="overview-grid">' + gridHtml("") + "</section>" +
    '\n    <footer class="pie"><p>FlakoPerformance · Wave Agencia</p></footer>';

  wireAlertasTabs(app);
  var input = document.getElementById("buscador");
  var grid = document.getElementById("overview-grid");
  input.addEventListener("input", function () {
    grid.innerHTML = gridHtml(input.value);
  });
}

function renderClientePage(procesados, slug, tabInicial) {
  var app = document.getElementById("app");
  var p = null;
  for (var i = 0; i < procesados.length; i++) {
    if (procesados[i].cliente.slug === slug) { p = procesados[i]; break; }
  }
  if (!p) {
    app.innerHTML = '<div class="breadcrumb"><a class="volver-link" href="#/">← volver al listado</a></div>' +
      '<p class="error-carga">Cliente "' + esc(slug) + '" no encontrado.</p>';
    return;
  }
  var c = p.cliente;
  var tabsDef = [["general", "General"], ["decision", "Decisión"], ["salud", "Salud técnica"]];
  var ids = tabsDef.map(function (t) { return t[0]; });
  var activo = ids.indexOf(tabInicial) !== -1 ? tabInicial : "general";
  var paneles = {
    general: renderClienteGeneral(p),
    decision: '<p class="pagina-intro">Una sola ventana por cliente, la que mejor calza con su ciclo real de decisión (3 o 7 días, configurable en <code>clientes.json</code> → <code>ventana_decision_dias</code>) — esta es la tabla que define si un anuncio se pausa, se reduce o se escala. Ya no compite con el gasto diario ni con problemas técnicos: eso vive aparte, en Salud técnica.</p>' +
      renderClienteVentana(p, p.v_decision, p.ventana_decision_label),
    salud: '<p class="pagina-intro">Chequeo diario de que nada esté <strong>técnicamente roto</strong> — gasto atípico de hoy (ya sin falsos positivos de anuncios recién lanzados) y presupuesto configurado que no se está gastando (probable problema de entrega). No es una tabla de rendimiento: un anuncio nuevo con gasto atípico no significa que esté fallando, solo que todavía no tiene historial para compararlo.</p>' +
      renderClienteVentana(p, p.v1, "salud técnica — hoy"),
  };
  app.innerHTML = '\n    <div class="breadcrumb"><a class="volver-link" href="#/">← volver al listado</a></div>' +
    '\n    <div class="cliente-header">' +
    '\n      <span class="dot dot-' + p.color + '"></span>' +
    "\n      <h1>" + esc(c.nombre) + "</h1>" +
    "\n    </div>" +
    '\n    <nav class="tabs-cliente">' +
    tabsDef.map(function (t) {
      return '<button type="button" data-tab="' + t[0] + '" class="' + (t[0] === activo ? "activa" : "") + '">' + esc(t[1]) + "</button>";
    }).join("") +
    "\n    </nav>" +
    tabsDef.map(function (t) {
      return '<div class="tab-panel-cliente' + (t[0] === activo ? " activa" : "") + '" data-panel="' + t[0] + '">' + paneles[t[0]] + "</div>";
    }).join("");

  app.querySelectorAll(".tabs-cliente button").forEach(function (btn) {
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
    document.getElementById("app").innerHTML = '<p class="error-carga">No se pudieron cargar los datos (' +
      esc(err.message) + "). Probá recargar la página.</p>";
  });
