# Medición y conversiones — VAXA

Este documento explica qué quedó instalado en el sitio y qué falta configurar en las plataformas.

> **Estado actual:** el código está listo y probado en local. Todavía **no se mide nada en producción**, porque faltan:
>
> 1. Los IDs reales de GTM, GA4, Google Ads y Meta.
> 2. Publicar el contenedor de GTM.
> 3. Subir los cambios a Hostinger.
> 4. Probar el formulario con el `mail()` del hosting.
>
> Hasta que se complete todo eso, no hay conversiones operativas.

---

## 1. Auditoría inicial

| Tema | Hallazgo |
|---|---|
| Framework | HTML + CSS + JS vanilla. Tiene 6 páginas y no usa SPA, router ni build. |
| Hosting | **Hostinger** (hPanel, cabeceras `platform: hostinger`, `.htaccess` LiteSpeed). La carpeta `.vercel` y el archivo `vercel.json` son de un deploy anterior. |
| Tracking previo | No había GA4, GTM, Google Ads ni Meta Pixel. Solo existía `js/analytics.js`, una demo que guarda eventos en el `localStorage` de cada navegador para el panel `/admin`. No envía datos a ningún lado. |
| WhatsApp | Hay 55 botones con `data-wa`. `js/interactions.js` les arma el link `wa.me/5491130236101?text=…`. Los de tanques llevan `data-area="tanques"`. |
| Teléfono | Hay enlaces `tel:+541130236101` en el footer y en la barra fija mobile, en las 6 páginas. |
| Formulario | El de `contacto.html` usaba `mailto:`: abría el programa de correo y **no confirmaba el envío**. No había backend ni página de gracias. |
| Duplicación | No había riesgo, porque no existía ninguna instalación previa. |

## 2. Qué se implementó

### Archivos nuevos

| Archivo | Para qué |
|---|---|
| `js/consent.js` | Va **sincrónico en el `<head>`**. Hace cuatro cosas: aplica Consent Mode v2 con todo denegado por defecto, carga GTM (el **único** punto de carga de GA4, Ads y Meta), muestra el banner de cookies y publica `page_type` en el dataLayer. |
| `js/tracking.js` | Envía los eventos al `dataLayer`. No llama directo a Google ni a Meta. También guarda la atribución de la sesión (con consentimiento) y dispara `generate_lead` en /gracias. |
| `api/presupuesto.php` | Endpoint real del formulario: valida los datos, aplica antispam, evita duplicados, **manda el mail** y guarda un respaldo. Si está configurada, también usa Meta CAPI. |
| `api/config.php` | Configuración del endpoint: destinatario, remitente, antispam y Meta CAPI. **No contiene secretos.** |
| `api/_data/.htaccess` | Bloquea el acceso web a los datos internos, como el respaldo y los IDs ya recibidos. |
| `gracias.html` | Página de confirmación (`noindex`). Se sirve en `/gracias` gracias al `.htaccess`. |
| `privacidad.html` | Política de privacidad y cookies (Ley 25.326). |
| `docs/gtm-container-vaxa.json` | Contenedor de GTM listo para importar. |

### Archivos modificados

- **Las 6 páginas `.html`:**
  - cargan `js/consent.js` en el head y `js/tracking.js` al final;
  - el footer tiene "Política de privacidad" y "Preferencias de cookies";
  - los botones de plagas llevan `data-area="plagas"`.
- **`contacto.html`:** el formulario `mailto` se reemplazó por un formulario de presupuesto. Campos: nombre, teléfono o WhatsApp, servicio, localidad, email (opcional) y consulta. Tiene honeypot antispam.
- **`js/interactions.js`:** el envío del formulario ahora hace un POST a `/api/presupuesto.php` y **solo** redirige a `/gracias` si el servidor responde `ok:true`. Si falla, muestra un error y ofrece WhatsApp.
- **`js/analytics.js`:** la demo local ahora solo registra si se aceptó la analítica.
- **`css/redesign.css`:** estilos del banner, del formulario, de /gracias y de /privacidad.
- **`.htaccess`:** rutas `/gracias` y `/privacidad`, y bloqueo de `config.php`.
- **`.gitignore`:** excluye `api/_data/*`, que contiene datos personales.
- **`tools/server.js`:** imita el endpoint PHP **solo en desarrollo**, sin enviar mails, para poder probar el flujo en local.

## 3. Eventos (dataLayer)

| Evento | Cuándo se dispara | Parámetros |
|---|---|---|
| `whatsapp_click` | Clic en `wa.me`, `api.whatsapp.com`, `web.whatsapp.com`, `whatsapp:` o un elemento `[data-wa]` | `service_type`, `cta_location`, `cta_type`, `cta_text`, `whatsapp_topic`, `event_id` |
| `phone_click` | Clic en un `tel:`. **Es la intención de llamar, no una llamada hecha.** | `service_type`, `cta_location`, `cta_type`, `cta_text`, `event_id` |
| `cta_click` | Otros botones comerciales: `mailto`, "Ver servicios", "Cómo llegar"/mapas, cualquier `a.btn` que no sea WhatsApp ni teléfono | `cta_type` (`boton`, `enlace`, `email`), `cta_location`, `cta_text`, `link_url` (sin querystring), `service_type` |
| `service_view` | La persona llega a una sección de servicio. Se dispara una vez por servicio y por página. | `service_type`, `cta_location` (id de la sección) |
| `quote_form_start` | Primer dato cargado en el formulario, una vez por carga de página | `form_id=quote_form`, `service_type` |
| `generate_lead` | **Solo en /gracias**, cuando el servidor confirmó la recepción del pedido | `lead_id` (UUID), `event_id` (= `lead_id`), `service_type`, `form_id` |
| `consent_update` | La persona acepta, rechaza o cambia sus preferencias | `consent_analytics`, `consent_ads` |

**`service_type`** puede ser `plagas`, `tanques` o `general`. Se toma del HTML real, nunca de palabras sueltas:

- en los botones, del atributo `data-area`;
- en los links, del ancla `#tanques` o `#fumigacion`;
- en el formulario, del grupo del `<select>`.

Los botones genéricos ("Presupuesto", el flotante) quedan como `general`.

**`cta_location`** puede ser:

- `header`, `menu_mobile`, `hero`, `flotante`, `barra_mobile`, `popup`, `footer`, `formulario`;
- o el id/clase de la sección: `tanques`, `diagnostico`, `fumigacion`, `laboratorio`, `cta_final`, `consorcios`…

**`cta_type`** puede ser `boton`, `enlace`, `boton_flotante`, `barra_fija` o `email`.

### Garantías contra duplicados y falsos leads

- Hay un solo listener de clics, y el mismo elemento no cuenta dos veces dentro de 1,2 s. Probado: el doble clic genera 1 evento.
- `generate_lead` se arma así:
  1. El formulario guarda el `lead_id` confirmado en `sessionStorage`.
  2. /gracias lo consume **una vez** y lo anota en `localStorage`.
  3. Si se recarga /gracias, se entra directo o se vuelve con "atrás", no hay lead. Probado.
- El servidor también deduplica por `lead_id`: si el mismo pedido llega dos veces, no se reenvía el mail.
- Google Ads recibe el `lead_id` como `orderId`, y Meta lo recibe como `eventID`. Así cada plataforma deduplica por su lado.

## 4. Consentimiento (Argentina, Google y Meta)

- El banner tiene **Aceptar**, **Rechazar** y **Configurar**, con el mismo peso visual. Las categorías son Analítica y Publicidad.
- La elección se puede cambiar desde el footer ("Preferencias de cookies") o desde /privacidad.
- **Consent Mode v2:** `ad_storage`, `ad_user_data`, `ad_personalization` y `analytics_storage` arrancan en `denied`. Pasan a `granted` según la elección (modo avanzado).
- **Meta Pixel:** en GTM, sus etiquetas exigen `ad_storage` y además están pausadas hasta configurarlas. Si después se retira el permiso, se ejecuta `fbq('consent','revoke')`.
- **Atribución propia:** las UTM se guardan solo con analítica aceptada. `gclid` y `fbclid`, solo con publicidad aceptada. Se guardan en `sessionStorage` y solo se usan para adjuntar el origen al mail del pedido.
- **Datos personales:** nunca van a GA4, a Ads ni a URLs. El formulario manda nombre y teléfono **solo** al servidor de VAXA.
- **Pendiente legal:**
  - Revisar el texto de `privacidad.html` con un asesor.
  - Evaluar la inscripción de la base de datos de clientes en el Registro de la AAIP.

## 5. Configuración pendiente (en orden)

### 5.1 Subir a Hostinger

1. Subir todo el sitio, incluida la carpeta `api/`. No hace falta subir `tools/`, `docs/` ni `node_modules/`.
2. En hPanel, la versión de PHP tiene que ser **7.4 o superior**. Se recomienda 8.x.
3. Correo:
   - La casilla `info@vaxasrl.com.ar` tiene que recibir mails.
   - Crear `no-reply@vaxasrl.com.ar`, o cambiar `mail_from` en `api/config.php` por otra casilla **del mismo dominio**.
   - Verificar que el SPF del dominio incluya Hostinger. Sin eso, los pedidos pueden caer en spam.
4. Probar el formulario real (ver §9). Si `mail()` falla, el usuario ve un error y no se cuenta ningún lead. Eso es correcto, pero hay que resolverlo:
   - Opción 1: pasar `envelope_sender` a `false`.
   - Opción 2: migrar a SMTP con credenciales guardadas fuera de `public_html`.

### 5.2 Google Tag Manager

1. Crear el contenedor web en tagmanager.google.com.
2. Poner su ID en `js/consent.js`, en `gtmId: "GTM-XXXXXXX"`. Es **el único lugar del sitio** donde va.
3. Importar el contenedor: **Admin → Importar contenedor** → elegir `docs/gtm-container-vaxa.json` → espacio de trabajo nuevo → **Combinar**.
4. En **Variables**, completar las constantes:
   - `CONST - GA4 Measurement ID` (G-…)
   - `CONST - Google Ads Conversion ID`: solo el número de AW-…
   - `CONST - Ads Label Lead`, `CONST - Ads Label WhatsApp`, `CONST - Ads Label Phone`
   - `CONST - Meta Pixel ID`
5. **Despausar** las etiquetas de Ads y Meta cuando sus IDs estén cargados.
6. Hacer **Vista previa**, probar (ver §9) y después **Enviar → Publicar**.

**Si el import falla**, crear todo a mano con la misma estructura:

| Etiqueta | Tipo | Activador | Consentimiento |
|---|---|---|---|
| GA4 - Google tag | Google tag (G-…) | Initialization - All Pages | (Consent Mode automático) |
| GA4 - Evento interacciones | Evento GA4, nombre `{{Event}}` | Evento personalizado, regex `^(whatsapp_click\|phone_click\|cta_click\|quote_form_start\|service_view)$` | automático |
| GA4 - generate_lead | Evento GA4 `generate_lead` | Evento personalizado `generate_lead` | automático |
| Ads - Conversion Linker | Vinculador de conversiones | All Pages | automático |
| Ads - Conversión Lead (PRINCIPAL) | Seguimiento de conversiones de Google Ads, Order ID = `{{DLV - lead_id}}` | `generate_lead` | automático |
| Ads - Conversión WhatsApp / Teléfono | Seguimiento de conversiones de Google Ads | `whatsapp_click` / `phone_click` | automático |
| Meta - Pixel base + PageView | HTML personalizado, una vez por página | All Pages + `consent_update` con `consent_ads = granted` | requiere `ad_storage` |
| Meta - Contact / Lead / ViewContent | HTML personalizado, con la base como etiqueta de configuración | `whatsapp_click\|phone_click` / `generate_lead` / `service_view` | requiere `ad_storage` |

Variables de la capa de datos (versión 2):

- `service_type`, `cta_location`, `cta_type`, `cta_text`, `link_url`
- `whatsapp_topic`, `form_id`, `lead_id`, `event_id`
- `page_type`, `consent_ads`

> **No agregar** el código de GA4, el de Meta ni otro `gtag.js` directo en el HTML: todo pasa por GTM. Si se duplica, cada evento se cuenta dos veces.

### 5.3 Google Analytics 4

1. Crear la propiedad, el flujo web y copiar el ID de medición `G-…` a GTM.
2. **Administrar → Definiciones personalizadas → Dimensiones** (alcance de evento):
   - `service_type`, `cta_location`, `cta_type`, `cta_text`
   - `whatsapp_topic`, `form_id`, `page_type`
   - No registrar `lead_id` ni `event_id`: tienen demasiados valores distintos.
3. **Administrar → Eventos clave:**
   - Marcar `generate_lead`. Es la conversión principal.
   - Opcional: marcar también `whatsapp_click` y `phone_click`, para ver tasas en GA4. **No** importarlos a Ads si ya se usan las etiquetas nativas (ver §5.4).
4. **Retención de datos:** pasarla a **14 meses**. Viene en 2 meses.
5. **Tráfico interno:** definir la IP del local y de las PCs de VAXA y activar el filtro. Así no se cuentan sus propios clics.
6. **Vincular Google Ads:** Administrar → Vinculaciones de productos → Google Ads.

### 5.4 Google Ads

**Recomendación: usar conversiones nativas de Ads desde GTM** y no importar las de GA4. Funcionan aunque la persona rechace la analítica, porque Consent Mode envía pings sin cookies. Además, usan `orderId` para deduplicar.

1. **Objetivos → Conversiones → Nueva acción → Sitio web → Configurar manualmente.** Crear 3 acciones:

   | Acción | Categoría | Tipo de acción | Recuento | Valor |
   |---|---|---|---|---|
   | Solicitud de presupuesto | Enviar formulario de clientes potenciales | **Principal** | Una | sin valor, o un valor estimado por lead |
   | Clic WhatsApp | Contacto | **Secundaria** | Una | — |
   | Clic teléfono | Llamada telefónica (clic en el número del sitio) | **Secundaria** | Una | — |

2. Copiar el ID de conversión (`AW-…`) y la etiqueta de cada acción a las constantes de GTM.
3. **Configuración de la cuenta:** activar el **etiquetado automático** (gclid).
4. **No** importar también `generate_lead` desde GA4 como principal. Si se importa, dejarlo como secundario. Si no, la misma solicitud cuenta dos veces.
5. Al principio, optimizar por "Solicitud de presupuesto". Si con pocos volúmenes hace falta más señal, se pueden sumar los clics de WhatsApp como principales **por un tiempo, sabiendo que no son presupuestos**.

### 5.5 Meta (Facebook / Instagram)

1. En **Events Manager**, crear o usar el dataset (píxel) y copiar el ID a `CONST - Meta Pixel ID`.
2. Verificar el dominio `vaxasrl.com.ar` en el Business Manager.
3. Despausar las 4 etiquetas Meta en GTM. Eventos que se envían:

   | Evento Meta | Cuándo | Notas |
   |---|---|---|
   | `PageView` | Cada página | Solo con publicidad aceptada |
   | `ViewContent` | Al llegar a una sección de servicio | `content_category`: plagas o tanques |
   | `Contact` | Clic en WhatsApp o teléfono | `contact_method`, `content_category` |
   | `Lead` | **Solo** el pedido confirmado (`generate_lead`) | `eventID` = `lead_id` |

4. En las campañas de clientes potenciales o ventas, optimizar por **Lead**. `Contact` sirve para medir, pero no es un presupuesto.

#### Meta Conversions API (opcional, ya programada y apagada)

El endpoint PHP puede mandar el evento `Lead` desde el servidor. Usa el mismo `event_id` que el navegador, y Meta deduplica `Lead` + `event_id`. Se envía **solo si la persona aceptó publicidad**. Para activarla:

1. En Events Manager → Configuración → Conversions API, **generar un token de acceso**.
2. Guardar el token **fuera de `public_html`**. Elegí una de estas dos opciones:
   - **Archivo:** crear `vaxa-secrets.php` en la carpeta del dominio, al lado de `public_html` (es la ruta que usa `secrets_file`):
     ```php
     <?php return ['meta_capi_token' => 'EL_TOKEN'];
     ```
   - **Variable de entorno:** `META_CAPI_TOKEN`, si el plan de hosting lo permite.
3. En `api/config.php`, completar:
   - `meta_pixel_id`.
   - `meta_graph_version`: revisar cuál es la versión vigente.
   - `meta_test_event_code`: completarlo mientras se prueba y **vaciarlo después**.
4. `meta_send_phone` queda en `false`. Así no se manda el teléfono, ni siquiera hasheado. Activarlo mejora el matching, pero conviene antes confirmar la redacción de la política.

**No está probada**: requiere el token real y el hosting. Mientras no se configure, no hace nada.

## 6. Variables y secretos

| Dónde | Clave | Uso |
|---|---|---|
| `js/consent.js` | `gtmId` | ID del contenedor de GTM. Es público. |
| GTM, constantes | GA4 ID, Ads ID y etiquetas, Pixel ID | Son públicos y viven en GTM, no en el código. |
| `api/config.php` | `mail_to`, `mail_from`, `meta_pixel_id`, `meta_graph_version`, `meta_test_event_code` | Configuración que no es secreta. |
| Variable de entorno o archivo `../vaxa-secrets.php` | `META_CAPI_TOKEN` / `meta_capi_token` | **Secreto.** Nunca va en el repo ni en `public_html`. |

## 7. UTM para Meta Ads

En cada anuncio, en **Parámetros de URL**, pegar:

```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

- `{{site_source_name}}` vale `fb` (Facebook), `ig` (Instagram), `msg` (Messenger) o `an` (Audience Network). Así GA4 separa Facebook de Instagram.
- **Hay que verificarlo** en GA4: en *Adquisición de tráfico*, las sesiones deberían caer en el canal **Paid Social**. Si caen en otro, crear un grupo de canales personalizado (condición: medio `paid_social`).

Ejemplos finales:

```
https://vaxasrl.com.ar/servicios.html?utm_source=ig&utm_medium=paid_social&utm_campaign=tanques_limpieza_nov26&utm_content=video_antes_despues&utm_term=consorcios_caba#tanques
https://vaxasrl.com.ar/?utm_source=fb&utm_medium=paid_social&utm_campaign=plagas_cucarachas_verano&utm_content=carrusel_1&utm_term=hogares_gba
```

Para posteos **orgánicos** en las bios o historias, usar `utm_medium=social` y `utm_source=instagram` (o `facebook`).

En **Google Ads** no hacen falta UTM: alcanza con el etiquetado automático (gclid).

Nomenclatura sugerida para `utm_campaign`: `servicio_tema_mesaño`, por ejemplo `plagas_roedores_jun27`. Así se puede filtrar por servicio.

## 8. Reportes: cómo responder cada pregunta

| Pregunta | Dónde verla |
|---|---|
| ¿Cuántas personas visitaron VAXA? | GA4 → Informes → Adquisición → Descripción general (usuarios, usuarios nuevos, sesiones) |
| ¿Cuántas vinieron de Google Ads? ¿Y de Facebook o Instagram? | GA4 → Adquisición de tráfico, por **Grupo de canales predeterminado de la sesión** (Paid Search / Paid Social) y por **Fuente / medio de la sesión** (`google / cpc`, `fb / paid_social`, `ig / paid_social`) |
| ¿Qué páginas visitaron? | GA4 → Interacción → Páginas y pantallas |
| ¿Cuántas hicieron clic en WhatsApp? ¿Cuántas intentaron llamar? | GA4 → Interacción → Eventos → `whatsapp_click` / `phone_click`. Desglosar por `cta_location` y `service_type`. |
| ¿Cuántas enviaron un presupuesto? | Evento clave `generate_lead`. El dato real de control son los mails recibidos con su ID de solicitud. |
| ¿Qué servicio genera más consultas? | Exploración libre: dimensión `service_type`; métricas: recuento de `whatsapp_click`, `phone_click` y `generate_lead` |
| ¿Qué campaña da mejores resultados? | GA4 → Adquisición de tráfico por **Campaña de la sesión**, con eventos clave. En Ads y en Meta, ver las conversiones de cada plataforma. |
| Tasa de conversión | GA4: *Tasa de eventos clave de la sesión* filtrada a `generate_lead` |

**Costo por lead (CPL):**

- **Google Ads:** el CPL se ve directo en Ads (*Costo / conv.* de la acción principal). Con GA4 vinculado, también aparece el costo en *Publicidad*.
- **Meta:** GA4 **no** recibe el gasto de Meta automáticamente. El CPL de Meta se ve en Ads Manager (*Costo por resultado* con el evento Lead).
- **Ambos en un solo tablero:** usar Looker Studio con:
  - el conector de GA4 para los leads por fuente/campaña;
  - el conector de Google Ads para el gasto;
  - el gasto de Meta, exportado a una Google Sheet.
  - Fórmula: CPL = gasto del canal / `generate_lead` de ese canal.
- Ojo con las diferencias entre plataformas: Ads, Meta y GA4 atribuyen distinto (ventanas, vista vs. clic). No hay que sumarlas.
- **Ninguna herramienta sabe qué presupuestos se convirtieron en trabajos cerrados.** Para eso, anotar en una planilla el `ID de solicitud` de cada mail y si se cerró (ver §10).

## 9. Cómo verificar que funciona

### Pruebas hechas en local (con el endpoint de desarrollo, sin mail real)

- [x] El banner aparece en la primera visita. "Rechazar" deja todo en `denied`, no guarda atribución y no activa la analítica local.
- [x] "Aceptar" dispara `consent update` + `consent_update` y guarda las UTM y el fbclid de la URL de llegada.
- [x] Las preferencias se pueden reabrir desde /privacidad y desde el footer.
- [x] `whatsapp_click` sale con la ubicación correcta en header, hero, diagnóstico (plagas), tanques, flotante y popup (tanques).
- [x] `phone_click` sale desde la barra mobile. `cta_click` sale para el mail y para "Ver servicios".
- [x] El doble clic sobre el mismo botón genera 1 solo evento.
- [x] `service_view` sale una vez por servicio en servicios.html.
- [x] El formulario vacío marca el error y no envía nada. `quote_form_start` se dispara una sola vez.
- [x] Envío correcto → redirige a /gracias → 1 `generate_lead` con `lead_id`.
- [x] Recargar /gracias, entrar directo o volver con un `lead_id` ya contado → 0 leads.
- [x] Si el servidor responde error, se muestra un aviso con WhatsApp, no hay redirección y no hay lead.
- [x] Las 8 páginas cargan sin errores de consola. Con el ID de ejemplo, GTM no se carga.

### No probado (requiere cuentas o el hosting)

- [ ] `api/presupuesto.php` real: no hay PHP en la máquina local. Probarlo en Hostinger enviando un pedido y confirmando que llega el mail.
- [ ] El import del contenedor de GTM y el disparo de las etiquetas.
- [ ] La recepción en GA4, Google Ads y Meta.
- [ ] Meta CAPI.

### Paso a paso en producción

1. **Formulario:** desde vaxasrl.com.ar/contacto.html, mandar un pedido de prueba (servicio: "Consulta general", consulta: "PRUEBA"). Tiene que:
   - llegar el mail a `info@vaxasrl.com.ar` con el "ID de solicitud";
   - redirigir a /gracias.
2. **GTM, Vista previa:** en tagmanager.google.com tocar **Vista previa**, pegar la URL del sitio y se abre Tag Assistant conectado.
   - Aceptar las cookies. En el panel tiene que aparecer `consent_update`.
   - Clic en un botón de WhatsApp: el evento `whatsapp_click` tiene que disparar *GA4 - Evento interacciones*, *Ads - Conversión WhatsApp* y *Meta - Contact*.
   - Rechazar en otra prueba: las etiquetas Meta tienen que aparecer como **bloqueadas por consentimiento**.
   - Mandar el formulario: en /gracias tiene que disparar `generate_lead` → *GA4 - generate_lead*, *Ads - Conversión Lead* y *Meta - Lead*. Recargar /gracias: **no** tiene que volver a disparar.
3. **GA4 DebugView:** Administrar → DebugView. Con la Vista previa de GTM abierta, los eventos aparecen en segundos con sus parámetros (`service_type`, `cta_location`…).
4. **Google Tag Assistant** (tagassistant.google.com): muestra el estado de consentimiento de cada hit, *Consent* → `ad_storage` / `analytics_storage`. En Ads, la acción pasa a "Registrando conversiones" dentro de las 24–48 h siguientes a la primera conversión.
5. **Meta Events Manager → Probar eventos:** pegar la URL, aceptar las cookies y hacer clic en WhatsApp → aparece `Contact`. Mandar el formulario → aparece `Lead` con el `event_id`. Si CAPI está activa, el Lead aparece dos veces (navegador y servidor) marcado como **deduplicado**.
6. Cuando todo dé bien, borrar el pedido de prueba y vaciar `meta_test_event_code`.

## 10. Segunda etapa (recomendaciones)

1. **Landings por servicio** para los anuncios (`/control-de-plagas`, `/limpieza-de-tanques`). Hoy todo apunta a páginas mixtas. Con landings propias mejora el nivel de calidad en Google Ads y `service_type` sale de la URL.
2. **Conversiones offline:**
   - Anotar en una planilla qué `ID de solicitud` terminó en trabajo cerrado, con su monto.
   - Importarlas a Google Ads (con gclid) y a Meta (CAPI offline). Así las campañas optimizan por ventas reales y no solo por pedidos.
3. **WhatsApp Business con etiquetas** o un CRM simple, para medir cuántas conversaciones terminan en presupuesto.
4. **Conversiones mejoradas de Google Ads** (teléfono hasheado desde el formulario), con la política actualizada.
5. Activar `meta_send_phone` y CAPI para mejorar el matching de Meta.
6. **Canonical y sitemap:** apuntan a `www.vaxafumigaciones.com` y no a `vaxasrl.com.ar`. Conviene unificarlos con el dominio real.
7. Sacar la demo `js/analytics.js` y `/admin`, que quedan redundantes con GA4.
8. **Seguimiento de llamadas reales** (número de desvío de Google Ads o un servicio de call tracking), si el teléfono pasa a ser un canal importante.
