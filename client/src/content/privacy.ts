/** Privacy-policy copy — shared by the /privacy page and the build-time prerender (scripts/prerender.ts). */

export interface Section {
  heading: string;
  headingEn: string;
  body: string;
  bodyEn: string;
}

export const PRIVACY_UPDATED = { en: "Updated September 2026", fi: "Päivitetty syyskuu 2026" };

export const SECTIONS: Section[] = [
  {
    heading: "Mitä tietoja keräämme",
    headingEn: "What we collect",
    body: `Keräämme vain tietoja, jotka ovat välttämättömiä palvelun toimivuuden ja kehittämisen kannalta.

Analytiikka: Käytämme PostHog-analytiikkaalustaa sivunäkymien, ominaisuuksien käyttöasteen ja virheilmoitusten seuraamiseen. Tiedot ovat anonymisoituja eikä niitä yhdistetä henkilökohtaisiin tietoihin. Voit kieltäytyä analytiikan keruusta sivuston evästekonsentin kautta.

Tukipyynnöt: Kun täytät tukilomakkeen osoitteessa /support, tallennamme antamasi tiedot: otsikon, kuvauksen, typin ja prioriteetin. Nimi ja sähköpostiosoite ovat valinnaisia. Tietoja käytetään vain yhteydenoton käsittelyyn.

Järjestelmänvalvojan istunto: Järjestelmänvalvojat kirjautuvat palvelun hallintapaneeliin. Kirjautumistila tallennetaan palvelinpuolen evästeeseen (HttpOnly) — selain ei pääse siihen käsiksi JavaScriptillä.

Tavallisilla käyttäjillä ei ole käyttäjätiliä eikä sovellus kerää sijaintitietoja kartan selailusta.`,
    bodyEn: `We only collect information that is necessary for the service to function and improve.

Analytics: We use PostHog to track page views, feature usage, and error reports. This data is anonymised and not linked to personally identifying information. You can opt out through the cookie consent banner on the site.

Support tickets: When you submit a form at /support, we store what you provide: a title, description, type, and priority. Name and email are optional. This information is used only to handle your enquiry.

Admin session: Admins authenticate to the management panel. Login state is stored in a server-side cookie (HttpOnly) — JavaScript on the page cannot access it.

Regular visitors have no user account and the app does not collect location data from map browsing.`,
  },
  {
    heading: "Evästeet ja paikallinen tallennustila",
    headingEn: "Cookies and local storage",
    body: `Evästeet: Sivusto voi asettaa analytiikkaevästeitä (PostHog), jos hyväksyt ne evästekonsentin kautta. Järjestelmänvalvojan kirjautuminen käyttää HttpOnly-istuntoevästettä.

Paikallinen tallennustila (localStorage): Tallennamme laitteellesi kielivalinnan, tumman tilan ja muita sovelluksen asetuksia. Nämä tiedot eivät poistu laitteeltasi.`,
    bodyEn: `Cookies: The site may set analytics cookies (PostHog) if you accept them through the consent banner. Admin login uses an HttpOnly session cookie.

Local storage: We store language preference, dark mode, and other app settings on your device via localStorage. This data stays on your device and is never sent to our servers.`,
  },
  {
    heading: "Tietojen käyttö",
    headingEn: "How we use your data",
    body: `Analytiikkatietoja käytetään palvelun kehittämiseen: ymmärtämään mitä ominaisuuksia käytetään ja missä esiintyy virheitä.

Tukipyynnöt käsittelee KSYK Maps -tiimi. Tietoja ei jaeta kolmansille osapuolille eikä käytetä mainontaan.`,
    bodyEn: `Analytics data is used to improve the service — to understand which features are used and where errors occur.

Support tickets are handled by the KSYK Maps team. Your data is not shared with third parties and is not used for advertising.`,
  },
  {
    heading: "Tietojen säilytys",
    headingEn: "Data retention",
    body: `Tukipyynnöt säilytetään hallintapaneelissa toistaiseksi tai kunnes ne poistetaan manuaalisesti. Analytiikkatiedot säilytetään PostHogin omien käytäntöjen mukaisesti. Voit pyytää tietojesi poistoa ottamalla yhteyttä tukilomakkeen kautta.`,
    bodyEn: `Support tickets are retained in the admin panel indefinitely or until manually deleted. Analytics data is retained in accordance with PostHog's own retention policies. You may request deletion of your data by contacting us through the support form.`,
  },
  {
    heading: "Oikeutesi",
    headingEn: "Your rights",
    body: `Sinulla on oikeus pyytää pääsyä tietoihisi, niiden oikaisemista tai poistamista. Lähetä pyyntö tukilomakkeen (/support) kautta.`,
    bodyEn: `You have the right to request access to, correction of, or deletion of your data. Send your request through the support form at /support.`,
  },
  {
    heading: "Muutokset tähän selosteeseen",
    headingEn: "Changes to this policy",
    body: `Voimme päivittää tätä tietosuojaselostetta. Merkittävistä muutoksista ilmoitetaan sovelluksessa.`,
    bodyEn: `We may update this privacy policy. Significant changes will be announced within the app.`,
  },
  {
    heading: "Yhteystiedot",
    headingEn: "Contact",
    body: `Tietosuojaa koskevat kysymykset: käytä tukilomaketta osoitteessa /support.`,
    bodyEn: `Privacy enquiries: use the support form at /support.`,
  },
];
