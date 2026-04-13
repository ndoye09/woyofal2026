# 🧪 TEST COMPLET - Design & Chatbot

## 🎨 DESIGN VISUEL

### **Page d'Accueil**
- [ ] **Gradient hero** : Bleu-Purple visible
- [ ] **Mini calculateur** : Fonctionne et affiche résultat
- [ ] **Buttons** : 
  - [ ] btn-primary → Bleu gradient
  - [ ] btn-accent → Rouge gradient
  - [ ] Hover → Glow effect
- [ ] **Cards** : Borders blanches, shadow au hover
- [ ] **Section tags** : Bleu avec bg léger
- [ ] **Animations** :
  - [ ] Fade-up au chargement
  - [ ] Smooth scroll
  - [ ] Icons avec animations

### **Simulateur**
- [ ] **Form inputs** : Focus ring bleu
- [ ] **Results** : Gradient background
- [ ] **Tranches** : Couleurs vertes/orange/rouges
- [ ] **Buttons** : Sauvegarder/Calculer avec glow
- [ ] **Detail** : Tableau lisible

### **Dashboard** (après connexion)
- [ ] **Stats cards** : Gradient + shadow
- [ ] **Historique** : Tableau avec alternance de couleurs
- [ ] **Graphique** : Ligne chart smooth
- [ ] **Buttons** : Nouvelle simulation visible

### **Pages Support**
- [ ] **Tarifs** : Cards avec hover
- [ ] **Conseils** : Calculateur budget visible
- [ ] **FAQ** : Questions expandables lisibles

---

## 🤖 CHATBOT

### **État Fermé**
- [ ] **Bouton flottant** : Visible bas-droit
- [ ] **Badge notification** : Rouge avec chiffre si messages
- [ ] **Couleur** : Rouge accent (#DC2626)
- [ ] **Hover** : Glow effect autour

### **État Ouvert**
- [ ] **Panel chat** : Slide depuis bas-droit
- [ ] **Header** : Bleu gradient avec icon bot
- [ ] **Buttons** :
  - [ ] Corbeille (clear) : Visible si messages
  - [ ] Chevron down (fermer) : Functional
- [ ] **Messages** :
  - [ ] User : Bleu gradient, aligné droit
  - [ ] Bot : Gris clair, aligné gauche
  - [ ] Bulles : Rounded corners

### **Input Area**
- [ ] **Champ texte** : Placeholder visible
- [ ] **Button d'envoi** : Bleu avec icon send
  - [ ] Disabled si vide ou loading
  - [ ] Hover : Darker blue
- [ ] **Enter key** : Envoie le message

### **Suggestions**
- [ ] **Au premier coup d'œil** : 8 suggestions visibles
- [ ] **Style** : Buttons gris border
- [ ] **Click** : Lance la question

### **Messages Bot**
- [ ] **Markdown** :
  - [ ] **Gras** : Texte épais
  - [ ] *Italique* : Texte incliné
  - [ ] Listes (•) : Puces visibles
  - [ ] Tables : Colonnes alignées
- [ ] **Typing dots** : Animation pendant réponse
- [ ] **Réponses** : Apparaissent smooth

---

## 🔴 RED FLAGS à Vérifier

### **Bugs Potentiels**
- [ ] ❌ Broken buttons (vérifier CSS)
- [ ] ❌ Chatbot fermé incompletement
- [ ] ❌ Messages pas scrollés vers le bas
- [ ] ❌ Input pas focusé au ouverture
- [ ] ❌ Gradients pas visibles (vérifier Tailwind build)
- [ ] ❌ Colors fades (vérifier contraste)
- [ ] ❌ Animations saccadées (vérifier animations)

### **Responsive Issues**
- [ ] ❌ Mobile : Chatbot panel trop wide
- [ ] ❌ Tablet : Columns mal alignées
- [ ] ❌ Buttons : Overlapping on mobile
- [ ] ❌ Text : Trop petit/gros

---

## 📊 TESTS SPÉCIFIQUES

### **1. Chatbot - Send Message**
```
1. Ouvrir le chatbot
2. Taper : "Combien de kWh pour 5000 FCFA"
3. Cliquer "Send" ou Entrée
4. Attendre réponse (typing dots)
5. Réponse apparaît en smooth fade
```

### **2. Buttons Hover**
```
1. Survoler btn-primary
2. Voir glow blue et shadow
3. Survoler btn-accent
4. Voir glow red
5. Texte reste lisible
```

### **3. Cards Hover**
```
1. Survoler une card
2. Voir shadow augmenter
3. Voir border change couleur
4. `-translate-y-0.5` appliqué (monte légèrement)
```

### **4. Form Focus**
```
1. Click sur input
2. Voir ring bleu autour
3. Border change couleur
4. Placeholder fade légèrement
```

### **5. Animations**
```
1. Au load : fade-up de la hero
2. Au load : logos icons fade-in
3. Hover buttons : smooth scale
4. Chat messages : slide-in depuis côté
5. Suggestions : scroll smooth
```

### **6. Colors**
```
1. Vérifier Primary = #0066FF (bleu)
2. Vérifier Accent = #DC2626 (rouge)
3. Vérifier Success = #059669 (vert)
4. Vérifier Danger = #DC2626 (rouge)
5. Gradients visibles sur buttons
```

---

## 🏃 QUICK TEST COMMAND

```bash
# 1. Lancer le dev server
npm run dev

# 2. Tests visuels (Homme-tester)
# Ouvrir http://localhost:5173

# 3. Checklist rapide:
# • Page charge rapidement ✓
# • Couleurs bleu/red visibles ✓
# • Chatbot bouton flottant visible ✓
# • Hover effects marchent ✓
# • Animations smooth ✓
# • Mobile responsive ✓
```

---

## 🎯 SUCCESS CRITERIA

✅ Si tous les tests passent, alors :
- Site à l'air moderne et professionnel
- Chatbot est fonctionnel et attractive
- Design est cohérent partout
- Animations sont smooth
- Mobile-friendly
- Prêt pour la production !

❌ Si des tests échouent :
- Vérifier la console (F12)
- Vérifier que `npm run dev` est en live
- Force refresh du navigateur (Ctrl+F5)
- Vérifier que Tailwind build est à jour
- Lancer `npm install` si besoin

---

## 📝 NOTES

### **Tailwind Build**
Si les styles ne s'appliquent pas :
```bash
# Rebuild Tailwind
npm run build

# Ou restart le dev server
npm run dev
```

### **Hot Reload**
Vite devrait recharger automatiquement. Si pas :
```bash
# Restart complètement
Ctrl+C
npm run dev
```

### **Cache Browser**
Si anciens styles persistent :
```bash
# Hard refresh
Ctrl+Shift+R  (Chrome/Firefox)
Cmd+Shift+R   (Mac)
```

---

## 📸 SCREENSHOTS À FAIRE

Pour validation, prendre screenshots de :
1. Home page (hero + cards + buttons)
2. Simulateur (avant et après)
3. Dashboard (stats cards + graph)
4. FAQ (questions + accordion)
5. Chatbot (closed + open + message)

---

**Prêt à tester ? Lance `npm run dev` et vérifie chaque item ! 🚀**
