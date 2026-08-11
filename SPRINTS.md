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

## Sprint 14 (S27-S28) — Rapports & business intelligence

**Back-office**
- [ ] Comparaison période sur période (N-1)
- [ ] Dashboard configurable (widgets réarrangeables)
- [ ] Rapport de facturation (heures facturables vs internes)
- [ ] Benchmark inter-sites
- [ ] Export CSV conformité RGPD (audit)
- [ ] Diff avant/après dans l'audit

---

## Sprint 15 (S29-S30) — Plateforme & portail client

**Back-office**
- [ ] Intégrations tierces (calendrier, messagerie)
- [ ] API publique documentée
- [ ] Portail client en lecture seule
- [ ] Devis/facturation liés à l'intervention
- [ ] Formulaires personnalisables (inspections, sécurité)

---

## Sprint 16 (S31-S32) — Mobile approfondi & fondations transverses

**Mobile**
- [ ] Aperçu météo sur l'accueil
- [ ] Widget écran d'accueil (prochaine mission sans ouvrir l'app)

**Transverse**
- [ ] Mode hors-ligne complet (au-delà de la file de synchronisation déjà existante)
- [ ] Design system partagé formalisé entre web et mobile

---

## Hors sprint — initiative stratégique à cadrer séparément

- **Application superviseur dédiée** (aujourd'hui web responsive uniquement, pas d'app native superviseur) — plus gros chantier qu'un sprint, à cadrer à part si prioritaire (périmètre, budget, delai).

---

*Établi à partir des plans « Plan d'amélioration — MadyPro Clean », « Refonte mobile — MadyPro Clean » et des deux listes de fonctionnalités best-in-class (août 2026). À ajuster sprint après sprint selon la vélocité réelle.*
