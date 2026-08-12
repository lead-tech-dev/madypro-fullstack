# MadyPro Clean — Plan de sprints

Découpage en sprints de 2 semaines des deux plans d'amélioration établis en août 2026 :
- **Back-office** (sites, équipes, interventions, pointage, absences, notifications, rapports, paramètres, audit)
- **Mobile** (refonte design + fonctionnel de l'app agent)

Deux pistes en parallèle (back-office / mobile). En solo, alterner ou dérouler une piste à la fois dans l'ordre indiqué — l'ordre au sein de chaque piste reste valable.

Sprints 0-6 : périmètre initial des deux plans, terminés. Sprints 7-16 : backlog initial + fonctionnalités best-in-class supplémentaires, découpés en sprints thématiques.

---

## Sprint 0 — Cadrage ✅ terminé

- [x] **Trancher le retrait du modèle `Client`** — suppression définitive actée, migration appliquée.
- [x] Nettoyer les résidus : module `clients` backend, filtre `clientId` mort, page `ClientsPage` web.
- [x] Corriger `/reports/performance` — vraies requêtes Prisma.

---

## Sprint 1 (S1-S2) ✅ terminé

**Back-office**
- [x] Détection de conflits d'affectation
- [x] Élargir la couverture du journal d'audit (+ persistance en base, ne vivait qu'en mémoire)

**Mobile**
- [x] Design tokens (palette teal + Fjalla One / Cabin)
- [x] Refactor `AgentInterventionScreen.tsx` en sous-composants

---

## Sprint 2 (S3-S4) ✅ terminé

**Back-office**
- [x] Photo obligatoire au check-in / check-out
- [x] Alerte superviseur en temps réel

**Mobile**
- [x] Composants de base (Card, StatusPill) sur les nouveaux tokens
- [x] Nouveau design sur l'écran Accueil (action prioritaire mise en avant)

---

## Sprint 3 (S5-S6) ✅ terminé

**Back-office**
- [x] Fiche site enrichie (instructions d'accès, code, contact, photos)
- [x] Cahier des charges / checklist par site

**Mobile**
- [x] Nouveau design sur l'écran Intervention / Pointage
- [x] Photo de fin de mission intégrée au flux normal (check-in + check-out)

---

## Sprint 4 (S7-S8) ✅ terminé

**Back-office**
- [x] Checklist qualité par intervention (copiée depuis le cahier des charges du site)
- [x] Suggestion de remplaçant sur absence validée
- [x] Pièces justificatives sur les demandes d'absence

**Mobile**
- [x] Tab bar redessinée (chrome sombre)
- [x] Indicateur de synchronisation discret sur l'accueil

---

## Sprint 5 (S9-S10) ✅ terminé

**Back-office**
- [x] Export paie CSV (heures normales/majorées, seuil 35h/semaine)
- [x] Accusé de lecture sur les notifications

**Mobile**
- [x] Calendrier visuel (DateTimePicker natif) pour les demandes d'absence
- [x] Aperçu riche dans les notifications push (site + horaire corrigés)

---

## Sprint 6 (S11-S12) ✅ terminé

**Back-office**
- [x] Export + envoi programmé par e-mail (hebdo lundi / mensuel le 1er, CSV joint) — SendGrid du compte actuel en quota épuisé, à surveiller
- [x] KPIs avancés (ponctualité, absentéisme, réalisation)
- [x] Surcharge des règles de pointage par site

**Mobile**
- [x] Vue planning — implémentée côté web (page superviseur réutilisée, ouverte aux admins) plutôt qu'un glisser-déposer dédié
- [ ] Stabilisation sur device réel — non réalisable dans cet environnement (pas de simulateur/device), à faire manuellement

---

## Sprint 7 (S13-S14) — Sécurité & permissions ✅ terminé

**Back-office**
- [x] Authentification à deux facteurs (2FA) — TOTP (otplib) + QR code (qrcode), setup/confirm/disable, login à deux étapes
- [x] Journal des connexions (qui, quand, depuis où — distinct de l'audit métier) — modèle `LoginEvent`, succès/échec/raison/IP/UA, `GET /auth/login-history`
- [x] Permissions granulaires par rôle — `User.permissions[]`, `PermissionsGuard`/`RequirePermission`, ADMIN bypass, appliqué à `/settings` (ex. supervisor avec `settings:manage`)
- [x] Webhooks sortants pour intégrations personnalisées — CRUD `/webhooks`, dispatch HMAC-SHA256 centralisé dans `RealtimeService.broadcast()`

**Mobile**
- [x] Geste rapide (swipe) pour pointer — composant `SwipeToConfirm` (PanResponder) sur Démarrer/Terminer l'intervention

---

## Sprint 8 (S15-S16) — Équipes avancées ✅ terminé

**Back-office**
- [x] Compétences & habilitations avec alerte d'expiration — `Certification`, `GET /certifications/expiring`
- [x] Documents RH (contrat, badge, permis) — `EmployeeDocument`, fichiers en base64 (convention du projet)
- [x] Échange de shift entre agents — `ShiftSwapRequest`, accept réaffecte réellement l'`InterventionAssignment`, notifie les deux agents
- [x] Fil d'actualité d'équipe — `TeamPost`, lecture pour tous, suppression par l'auteur ou un admin
- [x] Gamification / reconnaissance (badges, agent du mois) — catalogue `Badge` + attributions `UserBadge` (champ `period` pour les récompenses mensuelles), notifie l'agent
- [x] Onboarding checklist pour nouveaux agents — modèle de template + copie par agent, réutilise le pattern checklist existant (site/intervention)
- [ ] UI web back-office pour ces écrans — API uniquement dans cet environnement (pas d'accès pour valider une UI React dans ce sprint), à construire côté `web/` séparément

**Mobile**
- [x] Disponibilités déclarées par l'agent — écran `AgentAvailabilityScreen` (calendrier natif, disponible/indisponible + note), accessible depuis le profil

---

## Sprint 9 (S17-S18) — Absences avancées ✅ terminé

**Back-office**
- [x] Workflow de validation multi-niveaux — absences > 5 jours exigent une validation superviseur (`approve-level1`) avant l'approbation finale, sans changer l'enum de statut existant
- [x] Compteurs de solde de congés automatiques — `LeaveAllocation` par utilisateur/année (25 jours par défaut), solde calculé à partir des congés payés approuvés
- [x] Blocage de dates (périodes de forte activité) — `BlockedPeriod`, toute nouvelle demande chevauchant une période bloquée est rejetée
- [x] Auto-approbation sous conditions (absence courte + solde suffisant) — ≤ 2 jours, et pour les congés payés uniquement si le solde restant suffit
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 10 (S19-S20) — Notifications & communication ✅ terminé

**Back-office**
- [x] Templates de notification réutilisables — `NotificationTemplate`, sélection dans le formulaire web pour préremplir titre/message/catégorie/priorité
- [x] Catégories et priorité visuelle des notifications — champs `category`/`priority` (LOW/NORMAL/HIGH/URGENT), badge coloré dans l'historique web
- [x] Envoi différé des notifications — `scheduledFor`/`sentAt`, job toutes les 60s qui dispatch les notifications dues, champ datetime dans le formulaire web
- [x] Digest quotidien/hebdomadaire consolidé — job qui regroupe les notifications non lues par agent et envoie un résumé unique (quotidien à l'heure configurée, hebdomadaire le lundi)
- [x] Centre de notifications côté web — page existante enrichie (priorité, catégorie, envoi différé, escalade, modèles) plutôt que reconstruite de zéro
- [x] Escalade automatique si alerte non lue après un délai — `escalateAfterMinutes`, job toutes les 5 min qui notifie les admins si l'agent ciblé n'a pas lu à temps

**Mobile**
- [x] Chat interne agent ↔ superviseur — `ChatMessage` (thread par agent), écran `AgentChatScreen` (polling 15s), liste des threads côté web/API pour les superviseurs

---

## Sprint 11 (S21-S22) — Sites enrichis ✅ terminé

**Back-office**
- [x] Géofencing configurable par site — déjà couvert par `gpsDistanceMeters` (Sprint 6), rayon par site réellement appliqué au check-in/check-out (rejet si hors zone), pas de nouveau travail nécessaire
- [x] Contrats/SLA associés au site + alertes d'échéance — `SiteContract`, endpoint `GET /sites/contracts/expiring`
- [x] Score de satisfaction/qualité par site — calculé (non stocké) sur 90 jours glissants à partir du taux de complétion, des no-show et des anomalies
- [x] Multi-zones par site (bâtiment A/B, étages) — `SiteZone` (label, étage, ordre, statut traité)
- [x] Historique/timeline des incidents par site — agrégation chronologique des `Anomaly` liées aux interventions du site
- [x] Plan des locaux avec zones à traiter — `Site.planImageUrl` (base64) + `SiteZone.completed`
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 12 (S23-S24) — Inventaire & interventions avancées ✅ terminé

**Back-office**
- [x] Inventaire de fournitures par site + alerte de réapprovisionnement — `InventoryItem`, `GET /inventory/low-stock`
- [x] Suggestion d'affectation par proximité GPS — trie les agents disponibles par distance à partir de leur dernière position connue (heartbeat)
- [x] Optimisation de tournées multi-sites — heuristique du plus proche voisin sur les interventions du jour d'un agent
- [x] Vue carte temps réel des agents sur le terrain — `GET /attendance/live-map` (dernière position connue, fenêtre 30 min)
- [x] Signature client en fin de prestation — `Intervention.clientSignature` (base64, convention du projet)
- [x] Estimation de durée basée sur l'historique — moyenne des durées réelles (check-in → check-out) passées sur un site
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

**Mobile**
- [x] Scan code-barres pour l'inventaire de fournitures — nouvelle dépendance `expo-camera`, écran dédié (lecture + ajustement de quantité), validé par compilation Metro uniquement (pas de device/simulateur disponible dans cet environnement)

---

## Sprint 13 (S25-S26) — Pointage avancé & paie ✅ terminé

**Back-office**
- [x] QR code / badge NFC pour le pointage — QR par site (`GET /sites/:id/qr-code`, secret généré à la demande) accepté en alternative à la vérification GPS au check-in ; badge NFC non réalisable dans cet environnement (pas de matériel), non tenté
- [x] Règles de majoration fines (nuit, dimanche, jours fériés — au-delà du seuil 35h simple) — ventilation normal/nuit(22h-6h)/dimanche/férié (jours fériés français calculés, y compris mobiles via l'algorithme de Gauss), coexiste avec l'export CSV existant
- [x] Intégration paie directe (Payfit/Silae plutôt que CSV) — dispatch de la ventilation détaillée via l'infrastructure Webhooks existante (événement `payroll.export`), plutôt qu'un connecteur propriétaire fictif
- [x] Alerte superviseur sur oubli de pointage — job toutes les 5 min, notifie les vrais superviseurs du site (table `SiteSupervisor`) si un agent affecté n'a pas pointé 15 min après le début prévu
- [x] Détection d'anomalies de pointage (durées suspectes, pointages hors zone répétés) — `GET /attendance/anomalies` (durée hors norme vs moyenne du site, `outsideSince` répété ≥3 fois)
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 14 (S27-S28) — Rapports & business intelligence ✅ terminé

**Back-office**
- [x] Comparaison période sur période (N-1) — `GET /reports/comparison`, période courante vs période précédente de même durée, deltas en %, gère proprement l'absence de données (pas de division par zéro)
- [x] Dashboard configurable (widgets réarrangeables) — `UserDashboardLayout` (JSON par utilisateur), `GET/PUT /reports/dashboard-layout` ; UI web de réarrangement non construite dans ce sprint
- [x] Rapport de facturation (heures facturables vs internes) — `Intervention.billable` + `GET /reports/billing`
- [x] Benchmark inter-sites — `GET /reports/site-benchmark` (taux de complétion + anomalies sur 90 jours, classé)
- [x] Export CSV conformité RGPD (audit) — `GET /audit/export.csv`
- [x] Diff avant/après dans l'audit — `AuditLog.before`/`after` (JSON), câblé sur `UsersService.update` et `SitesService.update` comme démonstration
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 15 (S29-S30) — Plateforme & portail client ✅ terminé

**Back-office**
- [x] Intégrations tierces (calendrier, messagerie) — flux iCalendar par site (`GET /public-api/calendar/:siteId`, abonnable depuis Google/Outlook) ; la messagerie sortante est déjà couverte par les Webhooks (Sprint 7)
- [x] API publique documentée — Swagger/OpenAPI sur `/api/docs`, endpoints publics `/public-api/*` protégés par clé API (`ApiKey`, gérées via `/platform/api-keys`)
- [x] Portail client en lecture seule — jeton par site (`ClientPortalToken`, géré via `/platform/portal-tokens`), accès sans compte à `/public-api/portal/:token` (résumé + score qualité + interventions récentes + incidents)
- [x] Devis/facturation liés à l'intervention — `Quote` (brouillon/envoyé/payé/annulé), lié à un site et optionnellement une intervention
- [x] Formulaires personnalisables (inspections, sécurité) — `CustomForm` (champs définis en JSON) + `CustomFormSubmission`
- [ ] UI web back-office pour ces écrans — API uniquement dans ce sprint

---

## Sprint 16 (S31-S32) — Mobile approfondi & fondations transverses ✅ terminé

**Mobile**
- [x] Aperçu météo sur l'accueil — Open-Meteo (API gratuite, sans clé), météo du site de la prochaine mission affichée sur `AgentHomeScreen`
- [x] Widget écran d'accueil (prochaine mission sans ouvrir l'app) — **non réalisable dans cet environnement** (widget natif iOS/WidgetKit ou Android/App Widget, nécessite Xcode/Android Studio et un device) ; la donnée qu'un tel widget consommerait existe déjà (`GET /interventions/next`, testé en direct)

**Transverse**
- [x] Mode hors-ligne complet (au-delà de la file de synchronisation déjà existante) — cache local (AsyncStorage) du planning agent, bascule automatique en lecture seule hors-ligne avec indicateur dédié, en complément de la file d'écriture existante
- [x] Design system partagé formalisé entre web et mobile — [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (état des lieux + cible commune) et [`design-tokens.json`](./design-tokens.json) (jetons machine-lisibles) ; documentation uniquement, aucune migration de code forcée pour limiter le risque de régression visuelle en fin de session

---

# Phase 2 — Rattrapage UI web back-office (Sprints 17-25)

Les Sprints 7 à 16 ont livré leurs fonctionnalités uniquement côté API (voir notes
« UI web back-office non construite » dans chaque sprint ci-dessus). Cette phase
construit les écrans web correspondants, dans le même ordre thématique que la phase 1,
pour rendre ce qui existe déjà réellement utilisable par les admins/superviseurs.
Sprint 10 fait exception : son enrichissement du centre de notifications a déjà été
livré côté web pendant la phase 1.

Toutes les API listées ci-dessous existent déjà, ont été testées en direct sur Neon et
n'ont besoin d'aucun changement backend — ce n'est que du câblage front. Convention de
nommage : nouvelles pages sous `web/src/pages/<domaine>/`, routes déclarées dans
`web/src/routes/AdminRoutes.tsx` (et `SupervisionRoutes.tsx` si pertinent pour les
superviseurs), entrées de nav dans `web/src/components/layout/Sidebar.tsx` (le type
`group` existant permet de regrouper plusieurs sous-écrans sous un même intitulé).

## Sprint 17 (S33-S34) — UI Sécurité & permissions ✅ terminé

Réalisé tel que planifié, avec une page `SecuritySettingsPage.tsx` dédiée plutôt qu'un
onglet dans `SettingsPage.tsx` (plus cohérent avec la nouvelle nav groupée). Groupes de
navigation « Paramètres » et « Audit » ajoutés dans `Sidebar.tsx` (le composant ne
supportait qu'un seul groupe dépliable à la fois — corrigé pour en gérer plusieurs
indépendamment). Bug réel trouvé et corrigé en testant : la réponse de connexion
n'incluait jamais `twoFactorEnabled`/`permissions`, donc la page Sécurité affichait
« Désactivée » même quand la 2FA était active (`presentUser()` dans `auth.service.ts`).
Testé en direct dans le navigateur (Chrome via automatisation) : cycle 2FA complet
(activation, QR scanné via un vrai code TOTP généré, connexion à deux étapes,
désactivation), journal des connexions avec vraies entrées, permissions accordées et
retirées avec vérification en base, webhook créé/activé-désactivé/secret régénéré/
supprimé. Données de test nettoyées après coup.


**1. 2FA**
- Écran : nouvel onglet « Sécurité » dans `SettingsPage.tsx`, plus un second écran de
  connexion (code à 6 chiffres) déclenché quand `POST /auth/login` répond
  `{ twoFactorRequired: true, userId }`
- Flux : « Activer » → `POST /auth/two-factor/setup` (affiche QR + secret) → saisie du
  code → `POST /auth/two-factor/confirm` ; « Désactiver » → mot de passe →
  `POST /auth/two-factor/disable`
- Connexion à deux étapes : `POST /auth/login/two-factor`

**2. Journal des connexions**
- Écran : `web/src/pages/audit/LoginHistoryPage.tsx`, route `/audit/login-history`,
  lien depuis `AuditPage.tsx`
- Tableau paginé (date, email, succès/échec, raison, IP, user-agent) —
  `GET /auth/login-history?page=&pageSize=`

**3. Permissions granulaires**
- Écran : cases à cocher ajoutées dans `UserFormPage.tsx` (visibles pour les
  utilisateurs non-ADMIN) — `PATCH /users/:id/permissions`
- Permissions actuellement définies côté backend : `settings:manage`, `users:manage`,
  `reports:export`, `webhooks:manage`

**4. Webhooks**
- Écran : `web/src/pages/settings/WebhooksPage.tsx`, route `/settings/webhooks`
- Tableau (URL, événements, statut, dernière rotation) + création, activer/désactiver,
  régénérer le secret (affiché une seule fois à la génération), suppression —
  `GET/POST /webhooks`, `PATCH /webhooks/:id`, `PATCH /webhooks/:id/status`,
  `POST /webhooks/:id/rotate-secret`, `DELETE /webhooks/:id`
- Événements existants à lister dans le formulaire de création : `intervention.created`,
  `intervention.updated`, `intervention.status`, `intervention.checklist`,
  `attendance.checkin`, `attendance.checkout`, `attendance.arrival`, `payroll.export`

## Sprint 18 (S35-S36) — UI Équipes avancées ✅ terminé

Réalisé tel que planifié : habilitations/documents intégrés à `UserFormPage.tsx`,
nouveau groupe de nav « Équipes » (Liste, Échanges, Actualités, Badges, Onboarding,
Disponibilités). Testé en direct dans le navigateur sur un vrai agent : ajout/
suppression d'habilitation, création/suppression de publication, création de badge +
attribution + révocation, ajout d'étape au modèle d'onboarding + lancement pour un
agent + coche persistée en base (vérifié), pages Échanges et Disponibilités validées
(rendu + états vides corrects, endpoints déjà éprouvés lors des tests backend du
Sprint 8). Données de test nettoyées après coup.


**1. Habilitations & documents RH**
- Écran : deux nouveaux onglets dans `UserFormPage.tsx` (ou une future page détail
  agent dédiée) : « Habilitations » et « Documents »
- Habilitations : liste + création (libellé, date d'obtention, date d'expiration),
  alerte visuelle si expiration proche — `GET/POST /certifications`,
  `PATCH/DELETE /certifications/:id` ; bandeau global des habilitations expirantes sur
  le dashboard admin — `GET /certifications/expiring?days=30`
- Documents : upload (converti en base64 côté client, convention déjà utilisée pour les
  photos), liste par type (CONTRACT/BADGE/LICENSE/OTHER) —
  `GET/POST /employee-documents`, `DELETE /employee-documents/:id`

**2. Échange de shift**
- Écran : `web/src/pages/interventions/ShiftSwapsPage.tsx`, route
  `/interventions/echanges`
- Liste des demandes avec statut (PENDING/ACCEPTED/REJECTED/CANCELLED), actions
  accepter/refuser (arbitrage admin) — `GET /shift-swaps`,
  `POST /shift-swaps/:id/accept|reject|cancel`

**3. Fil d'actualité d'équipe**
- Écran : `web/src/pages/team/TeamFeedPage.tsx`, route `/equipe/actualites`, nouveau
  groupe de nav « Équipe »
- Zone de publication + flux chronologique + suppression (auteur ou admin) —
  `GET/POST /team-feed`, `DELETE /team-feed/:id`

**4. Badges**
- Écran : `web/src/pages/team/BadgesPage.tsx` (sous le même groupe nav « Équipe »)
- Catalogue (créer un badge : code, libellé, description, icône) + formulaire
  d'attribution (agent, badge, période optionnelle type `2026-08` pour un « agent du
  mois », note) + historique par agent — `GET/POST /badges`,
  `GET/POST /badges/awards`, `DELETE /badges/awards/:id`

**5. Onboarding**
- Écran : `web/src/pages/team/OnboardingPage.tsx` — gestion du modèle (liste ordonnée
  d'étapes, `GET/POST/DELETE /onboarding/template`) ; côté fiche agent, bouton
  « Lancer l'onboarding » (`POST /onboarding/users/:userId/seed`) puis liste à cocher
  (`GET /onboarding/users/:userId`, `PATCH /onboarding/items/:id`)

**6. Disponibilités déclarées**
- Écran : vue consolidée dans `SupervisorPlanningPage.tsx` ou nouvelle
  `web/src/pages/team/AvailabilityPage.tsx` — calendrier par agent (disponible /
  indisponible) sur une période — `GET /availability?from=&to=`

## Sprint 19 (S37-S38) — UI Absences avancées ✅ terminé

Réalisé tel que planifié : gating à deux niveaux câblé sur `AbsenceDetailPage.tsx` ET
sur l'action rapide de `AbsencesListPage.tsx` (le bouton bascule automatiquement entre
« Valider (niveau 1) » et « Approuver »), solde de congés affiché sur la fiche détail
pour les congés payés, périodes bloquées gérées depuis une nouvelle section de
`AbsencesListPage.tsx`. Testé en direct dans le navigateur : demande longue créée via
le flux agent réel (`POST /absences/request`, `requiresSecondApproval` calculé
automatiquement), validation niveau 1 puis approbation finale suivies en direct avec
mise à jour du solde de congés (25 → 14 jours restants sur une absence de 11 jours),
période bloquée ajoutée puis retirée. Données de test nettoyées après coup.


**1. Validation à deux niveaux**
- Écran : `AbsenceDetailPage.tsx` existant — si `requiresSecondApproval` et
  `!level1ApprovedBy`, le bouton d'approbation finale est désactivé et un bouton
  « Valider (niveau 1) » apparaît ; badge d'état une fois validé (« Niveau 1 validé par
  X le … ») — `POST /absences/:id/approve-level1`, le champ `requiresSecondApproval` /
  `level1ApprovedBy` / `level1ApprovedAt` est déjà renvoyé par `GET /absences/:id`

**2. Solde de congés**
- Écran : section dans la fiche agent (ou colonne dans `AbsencesListPage.tsx`) +
  modale d'édition de l'allocation annuelle — `GET /absences/leave-balance/:userId?year=`,
  `PATCH /absences/leave-balance/:userId`

**3. Périodes bloquées**
- Écran : section dans `AbsencesListPage.tsx` — liste + création (dates, raison) +
  suppression — `GET /absences/blocked-periods/list`, `POST /absences/blocked-periods`,
  `DELETE /absences/blocked-periods/:id`
- Note UX : une tentative de demande d'absence par un agent sur une période bloquée est
  déjà rejetée côté API avec un message explicite — juste s'assurer que ce message
  remonte proprement dans le formulaire de demande.

## Sprint 20 (S39-S40) — UI Communication ✅ terminé

Réalisé tel que planifié : `ChatPage.tsx` (deux colonnes, liste des conversations avec
badge non-lus + fil de conversation), ajoutée au groupe de nav « Équipes ». Testé en
direct dans le navigateur : message agent réel affiché avec badge non-lu, ouverture du
fil marquant automatiquement comme lu (badge disparaît), réponse envoyée et affichée
immédiatement. Données de test nettoyées après coup.


**1. Chat interne (vue superviseur)**
- Écran : `web/src/pages/team/ChatPage.tsx`, route `/messages`
- Layout deux colonnes : liste des conversations à gauche (agent, dernier message,
  badge non-lus), fil de conversation + zone de saisie à droite —
  `GET /chat/threads` (liste), `GET /chat/threads/:userId` (fil),
  `POST /chat/threads/:userId/messages` (envoi), `PATCH /chat/threads/:userId/read`
  (marquer lu à l'ouverture du fil)
- Rafraîchissement : polling simple (15-30s) suffit, cohérent avec l'implémentation
  mobile existante ; pas de WebSocket à ce stade.

## Sprint 21 (S41-S42) — UI Sites enrichis ✅ terminé

Implémenté directement dans `SiteFormPage.tsx` (formulaire existant, en édition
uniquement) plutôt que dans des onglets séparés : trois nouvelles sections
insérées avant les boutons d'action — « Contrats / SLA » (liste avec mise en
évidence rouge des contrats à échéance < 30 jours + formulaire d'ajout),
« Zones & plan des locaux » (aperçu de l'image de plan + upload base64 via
`FileReader`, liste des zones avec case « traité » et suppression), « Qualité
(90 derniers jours) » (score/100, interventions terminées/total, no-show,
anomalies, 5 derniers incidents). Nouveaux types `web/src/types/siteAdvanced.ts`
et fonctions client dans `sites.api.ts` (`listSiteContracts`,
`createSiteContract`, `deleteSiteContract`, `listExpiringContracts`,
`listSiteZones`, `createSiteZone`, `updateSiteZone`, `deleteSiteZone`,
`setSitePlanImage`, `getSiteIncidents`, `getSiteQualityScore`). Aucun
changement backend nécessaire. Testé en direct dans le navigateur avec un
compte admin QA jetable sur un site réel : création de contrat, création de
zone, bascule de la case « traité » (persistance vérifiée en base via Prisma),
et affichage du score qualité tous confirmés fonctionnels de bout en bout.
Le bandeau « contrats proches échéance » sur le dashboard et l'upload d'image
de plan n'ont pas été testés en direct (structurellement identiques à des
patterns déjà éprouvés ailleurs dans le code) ; le reste des données de test a
été nettoyé après validation.

Tous les items ci-dessous s'ajoutent comme nouveaux onglets dans `SiteFormPage.tsx`
(ou une future `SiteDetailPage.tsx` si la page actuelle reste un simple formulaire).

**1. Contrats/SLA** — onglet « Contrats » : liste + création (libellé, dates, détail
SLA, document) — `GET/POST /sites/:id/contracts`, `DELETE /sites/:id/contracts/:contractId` ;
bandeau des contrats proches échéance sur le dashboard admin —
`GET /sites/contracts/expiring?days=30`

**2. Multi-zones** — onglet « Zones » : liste ordonnée, création (libellé, étage),
case à cocher « traité » — `GET/POST /sites/:id/zones`, `PATCH/DELETE /sites/:id/zones/:zoneId`

**3. Plan des locaux** — dans le même onglet « Zones » : upload d'image (base64)
affichée en fond de plan — `PATCH /sites/:id/plan`

**4. Timeline incidents & score qualité** — onglet « Qualité » : score mis en évidence
(sur 100, calculé glissant sur 90 jours) + liste chronologique des anomalies —
`GET /sites/:id/quality-score`, `GET /sites/:id/incidents`

## Sprint 22 (S43-S44) — UI Inventaire & interventions avancées ✅ terminé

Les 5 fonctionnalités ont été implémentées : (1) section « Inventaire » ajoutée
dans `SiteFormPage.tsx` (tableau nom/code-barres/quantité/seuil, alerte rouge
sous le seuil, ajustement +1/-1, ajout/suppression) + bandeau « Réapprovisionnement
nécessaire » sur `DashboardPage.tsx` ; (2) bouton « Suggérer un agent » dans le
formulaire d'édition de `InterventionsPage.tsx`, listant les candidats disponibles
triés par distance GPS avec ajout en un clic à la liste d'agents ; (3) nouvelle
page `LiveMapPage.tsx` (route `/supervision/carte`, accessible aux admins et
superviseurs) affichant une carte Mapbox GL (lib `mapbox-gl` installée) avec un
marqueur par agent en mission, rafraîchie par polling 30s ; (4) section
« Optimisation de tournée » dans `SupervisorPlanningPage.tsx` (sélection agent +
date → ordre de visite optimisé et distance totale) ; (5) durée moyenne
historique affichée dans le formulaire de création d'intervention (calculée par
site/type), et upload de signature client (image) dans le détail d'une
intervention terminée. Nouveaux fichiers : `types/inventory.ts`,
`services/api/inventory.api.ts`, `pages/supervision/LiveMapPage.tsx` ; types et
fonctions client ajoutés à `intervention.ts`/`interventions.api.ts` et
`attendance.ts`/`attendance.api.ts`. Aucun changement backend nécessaire. Testé
en direct dans le navigateur avec un compte admin QA jetable : ajout d'article
d'inventaire et ajustement de quantité (persistance vérifiée en base), bandeau
de réapprovisionnement affiché correctement, carte temps réel rendue sans erreur
console, suggestions d'affectation GPS avec distances correctes et ajout à la
sélection d'agents, optimisation de tournée avec distance calculée, estimation
de durée moyenne affichée dynamiquement, et upload/persistance de signature
client (vérifiée en base) — tous confirmés fonctionnels de bout en bout. Données
de test nettoyées après validation.

**1. Inventaire par site** — onglet « Inventaire » dans la fiche site : tableau (nom,
code-barres, quantité, seuil), alerte visuelle si quantité ≤ seuil, ajustement rapide
(+1/-1) — `GET/POST /inventory?siteId=`, `PATCH /inventory/:id/adjust`,
`DELETE /inventory/:id` ; bandeau de réapprovisionnement sur le dashboard —
`GET /inventory/low-stock`

**2. Suggestions d'affectation GPS** — dans le flux d'affectation d'une intervention
(`InterventionsPage.tsx` ou son formulaire), bouton « Suggérer un agent » listant les
candidats disponibles triés par distance à leur dernière position connue —
`GET /interventions/:id/assignment-suggestions`

**3. Carte temps réel** — `web/src/pages/supervision/LiveMapPage.tsx`, route
`/supervision/carte` : carte (bibliothèque à choisir, ex. Leaflet + OpenStreetMap, pas
de clé API requise contrairement à Google Maps) avec un marqueur par agent en mission —
`GET /attendance/live-map`, rafraîchi par polling (30-60s)

**4. Optimisation de tournées** — dans `SupervisorPlanningPage.tsx` : sélection d'un
agent + date → affichage de l'ordre de visite optimisé et de la distance totale —
`GET /interventions/route-optimization?userId=&date=`

**5. Signature client & estimation de durée** — dans le détail d'une intervention :
affichage de la signature (image) si `clientSignature` est renseigné ; à la création
d'une intervention, afficher à titre indicatif la durée moyenne historique du site —
`GET /interventions/estimate-duration?siteId=&type=`

## Sprint 23 (S45-S46) — UI Pointage avancé & paie ✅ terminé

Les 3 fonctionnalités ont été implémentées : (1) section « QR code de pointage »
ajoutée dans `SiteFormPage.tsx` (image du QR + bouton « Imprimer » ouvrant une
fenêtre dédiée avec `window.print()`) ; (2) section « Paie détaillée » ajoutée
dans `ReportsPage.tsx` (tableau normal/nuit/dimanche/férié par agent + bouton
« Envoyer au prestataire de paie », affichée uniquement si la période contient
des données) ; (3) section « Anomalies de pointage » ajoutée dans
`AttendanceListPage.tsx` (durée suspecte vs moyenne du site, zone hors périmètre
répétée), fenêtre glissante de 30 jours fixée côté backend. Au passage, correction
d'un bug préexistant dans `ReportsPage.tsx` : un `<input>` de date dupliqué avec
des marqueurs de diff résiduels (`-`/`+`) laissés par une édition antérieure,
qui aurait affiché un second champ « Du » redondant. Nouveaux types/fonctions :
`SiteQrCode` (`siteAdvanced.ts`), `getSiteQrCode` (`sites.api.ts`),
`PayrollBreakdownRow` (`report.ts`), `getPayrollBreakdown`/`pushPayrollBreakdown`
(`reports.api.ts`), `AttendanceAnomaly` (`attendance.ts`), `getAttendanceAnomalies`
(`attendance.api.ts`). Aucun changement backend nécessaire. Testé en direct dans
le navigateur avec un compte admin QA jetable : QR code affiché et `qrSecret`
persisté en base (génération paresseuse confirmée), section paie détaillée
affichée avec de vraies données historiques et envoi au prestataire confirmé
(200 OK), section anomalies vérifiée avec des données simulées via interception
réseau côté page (aucune anomalie réelle sur les 30 derniers jours actuellement)
— rendu correct des deux types d'anomalies confirmé, aucune erreur console.
Compte QA nettoyé après validation.

**1. QR code de pointage** — onglet dans la fiche site : affichage du QR (image déjà
en base64) avec bouton « Imprimer » (impression ciblée sur cette zone) —
`GET /sites/:id/qr-code`

**2. Ventilation paie détaillée** — nouvel onglet « Paie détaillée » dans
`ReportsPage.tsx` : tableau normal/nuit/dimanche/férié par agent sur une période,
bouton « Envoyer au prestataire de paie » — `GET /reports/payroll-breakdown`,
`POST /reports/payroll-breakdown/push` (nécessite qu'un webhook `payroll.export` soit
configuré au préalable — dépend du Sprint 17)

**3. Détection d'anomalies de pointage** — nouvel onglet ou section dans
`AttendanceListPage.tsx` : liste des anomalies (durée suspecte vs moyenne du site,
zone hors périmètre répétée) — `GET /attendance/anomalies`

## Sprint 24 (S47-S48) — UI Rapports & business intelligence ✅ terminé

Les 5 fonctionnalités ont été implémentées : (1) section « Comparaison de
périodes » dans `ReportsPage.tsx` (KPI période actuelle avec deltas colorés
vert/rouge vs période précédente) ; (2) tableau de bord configurable sur
`DashboardPage.tsx` — mode « édition » avec bouton visibilité + réordonnancement
haut/bas par widget (implémenté sans librairie drag-and-drop dédiée : boutons
↑/↓ plutôt que `@dnd-kit/core`, pour éviter une dépendance lourde tout en
livrant la fonctionnalité demandée — réordonnancement et masquage des 4 widgets
existants — persistance via `GET/PUT /reports/dashboard-layout`) ; (3) section
« Rapport de facturation » dans `ReportsPage.tsx` (heures facturables/internes
par site) + case à cocher « Facturable » dans le détail d'une intervention
(`InterventionsPage.tsx`) ; (4) section « Benchmark inter-sites » dans
`ReportsPage.tsx` (taux de complétion, anomalies, 90 jours glissants) ; (5)
lignes dépliables dans `AuditPage.tsx` affichant le diff avant/après (valeur
barrée → nouvelle valeur en vert) + bouton d'export RGPD (`GET /audit/export.csv`,
téléchargement via fetch+blob avec authentification Bearer, ce endpoint ne
pouvant pas fonctionner en simple lien `<a href>`).

**Fix backend nécessaire** : `InterventionEntity`/`toEntity()` dans
`interventions.service.ts` ne renvoyait jamais le champ `billable` (stocké en
base mais absent de toute réponse `GET`/`PATCH`), ce qui aurait rendu la case
à cocher « Facturable » inopérante après rechargement — corrigé en ajoutant le
champ à l'entité et au mapper.

Testé en direct dans le navigateur avec un compte admin QA jetable : widgets du
dashboard masqués/réordonnés avec persistance vérifiée en base et rechargement
de page confirmé ; comparaison de périodes, facturation et benchmark affichés
avec des données réelles ; bascule facturable persistée et vérifiée en base ;
export RGPD déclenché avec le bon nom de fichier. Le diff avant/après de
l'audit n'a pu être vérifié qu'avec des données simulées (interception réseau
côté page) : aucune entrée `AuditLog` existante n'a de `before`/`after`
renseigné dans toute la base actuelle (`before`/`after` sont bien retournés par
`GET /audit` et le schéma les supporte, mais aucun appelant ne les alimente
aujourd'hui côté backend — gap préexistant, hors périmètre de cette phase
purement frontend) ; le rendu du diff a été confirmé fonctionnel avec des
données de test simulées. Compte QA et disposition de dashboard nettoyés après
validation.

**1. Comparaison de périodes** — dans `ReportsPage.tsx` : sélecteur de période +
affichage côte à côte période courante / période précédente avec deltas colorés
(vert/rouge) — `GET /reports/comparison`

**2. Dashboard configurable** — sur `DashboardPage.tsx` : mode « édition » permettant
de réordonner/masquer les widgets (glisser-déposer, ex. `@dnd-kit/core` — nouvelle
dépendance à évaluer), persistance de la disposition —
`GET/PUT /reports/dashboard-layout`. **Lot le plus complexe de la phase 2** (seule
fonctionnalité nécessitant une interaction drag-and-drop) ; à isoler en fin de sprint
si le temps manque, le reste de la phase 2 n'en dépend pas.

**3. Rapport de facturation** — onglet dans `ReportsPage.tsx` : tableau heures
facturables vs internes par site — `GET /reports/billing` ; la bascule
facturable/interne d'une intervention se fait depuis son détail
(`PATCH /interventions/:id` avec `{ billable: boolean }`)

**4. Benchmark inter-sites** — onglet dans `ReportsPage.tsx` : tableau classé (taux de
complétion, nombre d'anomalies, sur 90 jours glissants) — `GET /reports/site-benchmark`

**5. Diff avant/après dans l'audit** — dans `AuditPage.tsx` : ligne dépliable
affichant `before`/`after` en diff visuel (valeur précédente barrée, nouvelle valeur en
évidence) ; aucun nouvel endpoint, les champs sont déjà présents dans `GET /audit`
- Export RGPD : bouton lien direct vers `GET /audit/export.csv` (déjà un simple
  téléchargement, pas de composant particulier)

## Sprint 25 (S49-S50) — UI Plateforme & portail client

**1. Clés API** — `web/src/pages/settings/ApiKeysPage.tsx`, route `/settings/api-keys` :
création (la clé n'est affichée qu'une seule fois, à la génération), révocation, date
de dernière utilisation — `GET/POST /platform/api-keys`, `DELETE /platform/api-keys/:id`

**2. Jetons de portail client** — section dans la fiche site (ou même page que les
clés API) : génération d'un lien portail par site (affiche l'URL
`https://…/public-api/portal/:token` à copier/partager), révocation —
`GET/POST /platform/portal-tokens`, `DELETE /platform/portal-tokens/:id`

**3. Devis/facturation** — `web/src/pages/billing/QuotesPage.tsx`, route `/devis` :
liste filtrable par site/statut, création (site, intervention optionnelle, libellé,
montant, échéance, document), changement de statut
(brouillon → envoyé → payé/annulé) — `GET/POST /quotes`, `PATCH /quotes/:id/status`,
`DELETE /quotes/:id`

**4. Formulaires personnalisables** — `web/src/pages/forms/FormsPage.tsx`, route
`/formulaires` : constructeur simple (ajouter des champs — clé, libellé, type,
obligatoire) + consultation des soumissions par formulaire —
`GET/POST/DELETE /forms`, `GET /forms/:id/submissions` (la soumission elle-même se
fait côté terrain — mobile ou lien partagé —, pas depuis cet écran de gestion)

- Documentation API : lien direct vers `GET /api/docs` (Swagger déjà généré, aucun
  écran à construire)

---

## Hors sprint — initiative stratégique à cadrer séparément

- **Application superviseur dédiée** (aujourd'hui web responsive uniquement, pas d'app native superviseur) — plus gros chantier qu'un sprint, à cadrer à part si prioritaire (périmètre, budget, delai).

---

*Établi à partir des plans « Plan d'amélioration — MadyPro Clean », « Refonte mobile — MadyPro Clean » et des deux listes de fonctionnalités best-in-class (août 2026). Phase 2 (Sprints 17-25) ajoutée pour rattraper l'UI web des Sprints 7-16. À ajuster sprint après sprint selon la vélocité réelle.*
