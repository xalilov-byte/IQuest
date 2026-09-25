/* ─────────────────────────────────────────────────────────────────────────
   HUQUQIY SAHIFALAR — INGLIZCHA (/en/…)

   legal-uz.mjs ning tarjimasi; farq boʻlsa oʻzbekchasi ustun (sahifada
   yozilgan). EN darvozasining 4-sharti shu sahifalarga bogʻliq
   (ARXITEKTURA §8.4, pages.mjs → legalReady).

   Atamalar — ARXITEKTURA §8.5 glossariysi: points, coins, streak,
   Beginner … Diamond, Daily quests, My mistakes / Saved, IQ games,
   Shop / Badges / Showcase, Settings, Range.
   Uslub: rasmiy, qisqartmalarsiz, apostrofsiz (lintPage tekshiradi).
   §6 taqiqlari: official, certified, accredited, Mensa, percentile,
   «smarter than», IQ oshirish vaʼdasi — ishlatilmaydi. «clinical» faqat
   CONTRACT §6.2 rad qilish matnida.
   ───────────────────────────────────────────────────────────────────── */

export function enPages(c) {
  const { app, mail, telegram, developer, updated, disclaimer, ccby } = c;
  const note = '<p class="meta">Translated from Uzbek. If the texts differ, ' +
               'the Uzbek version prevails.</p>';

  return [
    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'maxfiylik',
      title: 'Privacy Policy',
      description: `What ${app} stores and what it never sends. No account, ` +
                   'no analytics: everything stays on your device.',
      body: `
<h1>Privacy Policy</h1>
<p class="lead"><strong>In short:</strong> ${app} does not collect any
personal data from you and does not send anything over the internet. No
account is needed, and there are no analytics and no ads. Your profile,
results and settings are stored only on your device.</p>
<p class="meta">Last updated: ${updated}</p>
${note}

<h2>1. Scope</h2>
<p>This policy applies to the ${app} app for Android and to its browser
version. App owner: ${developer}. Contact: ${mail}</p>

<h2>2. What we do not collect</h2>
<p>${app} <strong>sends no data</strong> to us or to any third party. In
particular, the app does not ask for or collect:</p>
<ul>
  <li>your phone number, email address, ID documents or other personal
      data;</li>
  <li>your location (GPS);</li>
  <li>your contacts, files, camera or microphone;</li>
  <li>device identifiers or the advertising ID;</li>
  <li>usage statistics.</li>
</ul>
<p>The app has no accounts: you use it without signing up.</p>

<h2>3. Profile: photo, name and bio</h2>
<p>Your username, bio, color and avatar are optional. They are stored
<strong>only on your device</strong>: they are not shown to other users
and are not sent anywhere.</p>
<p>If you add your own photo, you pick it yourself in the system image
picker. The app receives only the one image you choose, crops it to a
square and scales it down on the device itself, and saves it in the app
storage. The original file is not changed. The app does not ask for
access to your camera, gallery or files.</p>
<p>Your photo, name and bio are erased by <strong>Delete data</strong>
(<a href="../malumot-ochirish/">details</a>).</p>

<h2>4. What is stored on your device</h2>
<p>Everything below is kept only in the app storage (in the browser
version, in the browser storage for this site). We cannot see it.</p>
<table>
  <thead><tr><th>What</th><th>Why</th></tr></thead>
  <tbody>
    <tr><td>Profile: username, bio, color, avatar or photo,
            showcase</td>
        <td>To show your profile</td></tr>
    <tr><td>IQ test history: result, range, date, breakdown by question
            type</td>
        <td>To show your results</td></tr>
    <tr><td>Practice and game levels, records</td>
        <td>To choose the difficulty of the next questions and
            games</td></tr>
    <tr><td>Points, weekly points, league history, streak (active days
            in a row)</td>
        <td>For the league</td></tr>
    <tr><td>Coins, purchases, daily quests, badges</td>
        <td>For the Shop, quests and badges</td></tr>
    <tr><td>Answer log: question code, chosen option, correct or not,
            time</td>
        <td>So that results can be re-checked in the future; it is not
            sent anywhere now</td></tr>
    <tr><td>Unfinished test</td>
        <td>To resume the test where you left off if the app
            closes</td></tr>
    <tr><td>The My mistakes and Saved lists</td>
        <td>To solve those questions again</td></tr>
    <tr><td>Language, theme, sound, vibration and reminder
            settings</td>
        <td>So you do not have to choose them again each time</td></tr>
  </tbody>
</table>

<h2>5. Internet</h2>
<p><strong>This version of the app makes no network requests.</strong>
Questions are generated on the device itself, and your results and
profile are not sent anywhere. The app works fully offline.</p>
<p>Links that you open yourself (Terms of Use, Privacy Policy, Contact,
Rate the app) open in your browser, email app or Google Play. The app
does not attach any data about you to them.</p>
<p>In the browser version, your browser contacts the site server to load
the page. As with any website, the server technically sees your IP
address, browser type and the time of the request, and the hosting
provider may keep such technical logs under its own rules. We do not use
this data to track users or build profiles. Once the page has loaded,
the app makes no further requests.</p>

<h2>6. Analytics, ads and third parties</h2>
<p>The app has <strong>no</strong> analytics (Google Analytics, Firebase
or similar), no ads, no crash-reporting libraries and no social media
trackers. Fonts are built into the app and are not loaded from external
servers.</p>
<p>If you install the app from Google Play, Google may collect data
during installation and updates under the Google privacy policy. In
Google Play Console we see only aggregated statistics (for example, the
number of installs and crash reports) that do not identify you.</p>

<h2>7. Notifications</h2>
<p>Reminders are <strong>off</strong> by default. The app asks for
notification permission only when you turn a reminder on. Reminders are
scheduled and shown by the phone itself: no push messages are sent from
a server, and no device token is stored. You get at most two reminders a
day. You can turn them off in Settings at any time; without permission,
the app works as usual.</p>

<h2>8. Children</h2>
<p>The app does not ask anyone, including children, for personal data
and does not collect it.</p>

<h2>9. Deleting data and your rights</h2>
<p>We hold no data about you, so you do not need to send us a request to
see or delete it: everything is on your device and under your control.
In the app: <strong>Profile › Settings › Delete data</strong>. Other
ways are described <a href="../malumot-ochirish/">on this page</a>.</p>

<h2>10. Changes</h2>
<p>If accounts, server-side result checks, a shared leaderboard or other
online features are added to the app, this policy will be updated
<strong>in advance</strong>, and the new date will be shown on this
page. Data that this policy says is not collected will not start being
collected silently.</p>

<h2>11. Contact</h2>
<p>For questions or complaints: ${mail}${telegram ? ' · Telegram: ' + telegram : ''}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'shartlar',
      title: 'Terms of Use',
      description: `${app} Terms of Use: important information about the test ` +
                   'result, coins and badges, liability.',
      body: `
<h1>Terms of Use</h1>
<p class="meta">Last updated: ${updated}</p>
${note}

<h2>1. What ${app} is</h2>
<p>${app} is an app for testing and practicing logical thinking: an
adaptive IQ test, practice by question type and IQ games. It is an
<strong>educational and entertainment app</strong>. By using the app,
you agree to these terms.</p>

<h2>2. Important information about your result</h2>
<div class="warn">
<p><strong>${disclaimer}</strong></p>
<p>The <strong>Range</strong> shown under your IQ result gives the likely
limits of the result: a single test cannot produce an exact number. The
questions have not yet been normed on a large sample, so the result is
meant for tracking your own progress.</p>
<p>The test is not a medical, psychological or professional diagnostic
tool and does not detect any condition. Do not use the result as a basis
for hiring, admission to education, treatment or other important
decisions.</p>
<p>${app} is not affiliated with any government body, educational
institution or international organization. Your result is not compared
with the results of other people.</p>
</div>

<h2>3. Practice and IQ games</h2>
<p>Practice and IQ games help you exercise attention, memory, speed and
logical thinking. Results on a practiced task usually improve, but this
does not mean that general intelligence or IQ has changed. <strong>We do
not promise that practice will change your IQ result.</strong></p>
<p>Some admission exams include logic tasks. You can practice similar
types of tasks in the app, but ${app} is not affiliated with any exam
organizer.</p>

<h2>4. Points, league and leaderboard</h2>
<p>Points are awarded for correct answers and game results; weekly
points set your league tier (from Beginner to Diamond). For now, points
and the league are calculated only on your device and show only your own
progress. The app has no list of other users and no shared leaderboard.
If a shared leaderboard is added, it will use only results re-checked on
a server.</p>

<h2>5. Coins, badges and the Shop</h2>
<p><strong>Coins and badges have no monetary value and cannot be sold or
exchanged.</strong></p>
<ul>
  <li>You earn coins only by being active in the app: daily quests,
      achievement badges, the end-of-week reward and a one-time welcome
      bonus.</li>
  <li>Coins cannot be bought with money. They cannot be exchanged for
      money, points or anything else, and cannot be transferred to
      another person.</li>
  <li>Coins can be spent only in the Shop on profile customization:
      profile colors and collection badges. Purchases do not affect
      points, the league, your IQ result or levels.</li>
  <li>There are no random rewards (chests, lotteries). The price is shown
      before you buy.</li>
  <li>Achievement badges can only be earned, not bought. A badge you have
      earned is never taken away.</li>
  <li>Purchases are final.</li>
  <li>Coins, badges and purchases are stored only on your device. Delete
      data, uninstalling the app or clearing its data erases them
      completely, and we cannot restore them.</li>
  <li>If accounts are added in the future, the terms for moving coins and
      badges from your device (including any limits) will be announced
      in advance.</li>
</ul>

<h2>6. Payments</h2>
<p>The app is free: it has no in-app purchases, subscriptions or ads.
The test and its result will never be placed behind a payment. If paid
features are ever added, this page will state clearly what stays free and
what is paid, and this will be shown before any payment.</p>

<h2>7. Profile</h2>
<p>Your username and bio are optional and, for now, visible only to you.
The app does not accept offensive words or links. Do not use personal
data of other people or images that do not belong to you.</p>

<h2>8. Acceptable use</h2>
<p>You may use the app free of charge for personal purposes. The
following is not allowed:</p>
<ul>
  <li>bulk copying of questions and games and distributing them in other
      services;</li>
  <li>trying to inflate points, coins or results artificially
      (auto-clickers, modifying the app);</li>
  <li>any action that harms the operation of the app.</li>
</ul>

<h2>9. Your data</h2>
<p>Your profile, results, points, coins and lists are stored only on your
device. If you uninstall the app or clear its data, they are lost: we
have no copy, so we cannot restore them. See the
<a href="../maxfiylik/">Privacy Policy</a> for details.</p>

<h2>10. Liability</h2>
<p>The app is provided &ldquo;as is&rdquo;. We work to fix errors, but we
do not guarantee that the app will run without interruptions or errors.
Users are responsible for decisions made on the basis of results in the
app.</p>

<h2>11. Credits</h2>
<p>The app interface is based on Game Management App UI Kit
(${ccby}).</p>

<h2>12. Changes and languages</h2>
<p>When these terms change, the new date is shown on this page;
significant changes are announced before they take effect. These terms
are published in Uzbek, Russian and English; if the texts differ, the
Uzbek version prevails.</p>

<h2>13. Contact</h2>
<p>${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'aloqa',
      title: 'Contact',
      description: `How to contact ${app}: questions, suggestions and bug ` +
                   'reports.',
      body: `
<h1>Contact</h1>

<h2>Email</h2>
<p class="big">${mail}</p>
${telegram ? `
<h2>Telegram</h2>
<p class="big">${telegram}</p>
` : ''}
<h2>Found a mistake in a question?</h2>
<p>Send a screenshot of the question screen (with your answer and the
Explanation) and tell us what you think is wrong. We will check it and
fix it.</p>

<h2>Is the app not working?</h2>
<p>Tell us your device model, Android version and app version (shown at
the bottom of Settings) so we can find the problem faster.</p>

<h2>Deleting your data</h2>
<p>You do not need to write to us for this:
<a href="../malumot-ochirish/">here is how to do it</a>.</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'malumot-ochirish',
      title: 'Data Deletion',
      description: `How to delete ${app} data. Everything is on your device, ` +
                   'so no request is needed.',
      body: `
<h1>Data Deletion</h1>

<p class="lead">No data about you is stored on a server: ${app} never
asks for an account, name or phone number. So there is no need to send
us a request: all data is on your device, and you delete it
yourself.</p>

<h2>In the app</h2>
<p><strong>Profile › Settings (gear icon) › Delete data ›
Delete</strong></p>
<p>What is deleted:</p>
<ul>
  <li>your profile: photo, username, bio, color and showcase;</li>
  <li>IQ test history, an unfinished test, practice and game levels,
      records;</li>
  <li>points, weekly points, league history and your streak;</li>
  <li>coins, purchases, daily quests and badges;</li>
  <li>the My mistakes and Saved lists and the answer log.</li>
</ul>
<p>What stays: language, theme, sound and reminder settings, and a note
that you have finished the introduction (so the welcome bonus is not
given again). To delete these too, use one of the methods below.</p>

<h2>Through Android settings</h2>
<ol>
  <li><strong>Settings › Apps › ${app} › Storage › Clear data</strong>
      deletes everything, including settings;</li>
  <li>or uninstall the app.</li>
</ol>

<h2>In a browser (web version)</h2>
<p>In your browser settings, clear the data stored for this site.</p>

<p class="warn">Deletion <strong>cannot be undone</strong>. We have no
copy, so we cannot restore your data.</p>

<h2>If accounts are added later</h2>
<p>When accounts and server-side result checks are added, the app will
have a separate button to delete server data, and this page will be
updated in advance. No such data exists today.</p>

<h2>Questions?</h2>
<p>${mail}</p>`,
    },
  ];
}
