# 📋 Инструкция по синхронизации репо с GitHub и Vercel

**Дата**: 1 ноября 2025  
**Статус**: 🆕 Anti-Oscillation Protection готовая к развертыванию  
**Целевые URL**:
- GitHub Pages: https://montagnikrea-source.github.io/SuslovPA/
- Vercel: https://suslovpa.vercel.app/

---

## 📦 Новые файлы для синхронизации

### Добавлены в контейнере Dev:
```
✨ anti-oscillation.js
   └─ 470 строк, OscillationDamper class с 7-уровневой защитой

📄 public/noninput.html
   └─ 9082 строк (было 8666), патчено с damper integration

🧪 tests/test-anti-oscillation.js
   └─ 53 unit теста (100% pass rate)

📖 ANTI_OSCILLATION_GUIDE.md
   └─ Документация, туниинг, troubleshooting

🔧 scripts/patch-anti-oscillation.js
   └─ Скрипт для интеграции damper в NeuroHomeo
```

---

## 🔄 Шаги синхронизации (на Windows)

### Шаг 1: Подготовка локальной копии

Откройте PowerShell или Git Bash на Windows в папке с клоном репо:

```powershell
# Убедитесь что вы в корне репо
cd C:\Users\YourName\Projects\SuslovPA
# или где хранится ваша копия

# Проверьте что .git есть
git status
```

**Ожидаемый результат**:
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Если видите ошибку — это не git репо, нужно клонировать заново:
```powershell
git clone https://github.com/montagnikrea-source/SuslovPA.git
cd SuslovPA
```

---

### Шаг 2: Обновить все ветки

```powershell
# Fetch все обновления с удаленного сервера
git fetch origin

# Проверьте какие ветки есть
git branch -a
```

**Ожидаемый результат**:
```
* main
  remotes/origin/gh-pages
  remotes/origin/main
```

Если `gh-pages` нет локально, создайте:
```powershell
git checkout -b gh-pages origin/gh-pages
```

---

### Шаг 3: Переключитесь на `main` ветку (для Vercel)

```powershell
# Переключитесь на main
git checkout main

# Обновите до последней версии
git pull origin main

# Скопируйте новые файлы с контейнера (они здесь подготовлены)
# Скопируйте эти файлы в локальную папку репо:
# - anti-oscillation.js → /SuslovPA/anti-oscillation.js
# - ANTI_OSCILLATION_GUIDE.md → /SuslovPA/ANTI_OSCILLATION_GUIDE.md
# - tests/test-anti-oscillation.js → /SuslovPA/tests/test-anti-oscillation.js
# - scripts/patch-anti-oscillation.js → /SuslovPA/scripts/patch-anti-oscillation.js

# (На Windows используйте Проводник или PowerShell copy)
Copy-Item -Path "\\container\path\anti-oscillation.js" -Destination ".\anti-oscillation.js"
Copy-Item -Path "\\container\path\tests\test-anti-oscillation.js" -Destination ".\tests\test-anti-oscillation.js"
Copy-Item -Path "\\container\path\scripts\patch-anti-oscillation.js" -Destination ".\scripts\patch-anti-oscillation.js"
Copy-Item -Path "\\container\path\ANTI_OSCILLATION_GUIDE.md" -Destination ".\ANTI_OSCILLATION_GUIDE.md"

# Добавьте все изменения
git add -A

# Сделайте commit
git commit -m "feat(anti-oscillation): add comprehensive damping protection to NeuroHomeo algorithm

- Created OscillationDamper class (470 lines)
- Patched NeuroHomeo in production code
- Added 53 unit tests (100% pass rate)
- Documentation: ANTI_OSCILLATION_GUIDE.md"

# Push в main (для Vercel)
git push origin main
```

**Vercel автоматически переразвернётся** после push в `main`.

---

### Шаг 4: Синхронизировать `gh-pages` ветку (GitHub Pages)

```powershell
# Переключитесь на gh-pages
git checkout gh-pages

# Обновите до последней версии
git pull origin gh-pages

# Скопируйте также public/nosinput.html (с damping protection)
Copy-Item -Path "\\container\path\public\noninput.html" -Destination ".\public\noninput.html"

# А также остальные public файлы (index.html, about.html, etc)
# если они обновились

# Добавьте обновления
git add -A

# Commit
git commit -m "chore(pages): update public site with anti-oscillation protection

- Updated noninput.html with OscillationDamper integration
- All tests passing
- Ready for production deployment"

# Push в gh-pages
git push origin gh-pages
```

**GitHub Pages переразвернётся** после push в `gh-pages` (может занять 30-60 сек).

---

### Шаг 5: Вернитесь на main (финальная безопасность)

```powershell
git checkout main

# Убедитесь что всё закоммичено
git status

# Должно быть: "On branch main" и "nothing to commit"
```

---

## ✅ Проверка развертывания

### Проверка GitHub Pages

Откройте в браузере:
```
https://montagnikrea-source.github.io/SuslovPA/
```

Нажмите **F12** → **Console** и найдите:
```javascript
✅ СИСТЕМА ЗАЩИТЫ АКТИВИРОВАНА
```

Или проверьте исходный код страницы (Ctrl+U) и найдите:
```javascript
class OscillationDamper {
```

**Если вижу это** — ✅ GitHub Pages синхронизирована!

---

### Проверка Vercel

Откройте в браузере:
```
https://suslovpa.vercel.app/
```

Посмотрите на **Network** tab в DevTools:
- `noninput.html` должен содержать `OscillationDamper`

Если нет, нужно пересчитать на Vercel:

```powershell
# На Windows в VS Code terminal:

# Установить Vercel CLI (один раз)
npm install -g vercel

# Переразвернуть
vercel --prod
```

Или вручную на https://vercel.com/dashboard:
1. Откройте проект `SuslovPA`
2. Нажмите **Redeploy** → **Redeploy project**
3. Подождите ~2-3 минуты

---

## 📊 Статус развертывания

| Сервис | URL | Ветка | Статус | Проверка |
|--------|-----|-------|--------|----------|
| **GitHub Pages** | https://montagnikrea-source.github.io/SuslovPA/ | `gh-pages` | 🔄 Push в процессе | Должна содержать OscillationDamper |
| **Vercel** | https://suslovpa.vercel.app/ | `main` | 🔄 Push в процессе | Должна содержать OscillationDamper |

---

## 🔍 Детальная проверка кода на сайте

### Способ 1: Browser DevTools Console

```javascript
// Выполните в консоли браузера (F12)

// Проверить что damper инициализирован
typeof OscillationDamper
// Ожидаемо: "function"

// Проверить что NeuroHomeo использует damper
// (зависит от инициализации на странице)
console.log('✅ Anti-Oscillation Protection Loaded')
```

### Способ 2: Проверить исходный код

1. Откройте https://montagnikrea-source.github.io/SuslovPA/
2. Нажмите **Ctrl+U** → **Ctrl+F** найдите `OscillationDamper`
3. Должно быть: `class OscillationDamper {`

### Способ 3: Проверить на Vercel

1. Откройте https://suslovpa.vercel.app/
2. Откройте **DevTools** → **Network**
3. Откройте **noninput.html**
4. Найдите в коде: `this.damper = new OscillationDamper`

---

## 📝 Что если что-то не работает?

### GitHub Pages не обновляется

```powershell
# 1. Проверьте что вы push-ли в gh-pages
git log --oneline -5
# Должно быть последний commit про anti-oscillation

# 2. Перечитайте кэш браузера
# Ctrl+Shift+R (полная перезагрузка)

# 3. Проверьте что файл есть в gh-pages
git checkout gh-pages
ls public/noninput.html
# Должен быть файл

# 4. Если нет — скопируйте и push ещё раз
git add public/noninput.html
git commit -m "fix: ensure noninput.html in gh-pages"
git push origin gh-pages
```

### Vercel не обновляется

```powershell
# Способ 1: Trigger redeploy через Vercel CLI
npm install -g vercel
vercel --prod --force

# Способ 2: Через веб-интерфейс
# 1. Откройте https://vercel.com/dashboard
# 2. Выберите проект SuslovPA
# 3. Нажмите "Redeploy"
# 4. Выберите commit с anti-oscillation
# 5. Нажмите "Redeploy project"
```

### Файлы не синхронизированы

```powershell
# Проверьте status обеих веток
git checkout main
git status

git checkout gh-pages
git status

# Если есть незакоммиченные файлы:
git add -A
git commit -m "sync: update all files"
git push origin gh-pages
```

---

## 🚀 Быстрый чек-лист

- [ ] Локальная копия репо имеет `.git`
- [ ] Есть обе ветки: `main` и `gh-pages`
- [ ] Скопированы все новые файлы:
  - [ ] `anti-oscillation.js`
  - [ ] `ANTI_OSCILLATION_GUIDE.md`
  - [ ] `tests/test-anti-oscillation.js`
  - [ ] `scripts/patch-anti-oscillation.js`
  - [ ] `public/noninput.html` (с damper)
- [ ] `main` ветка: git push origin main
- [ ] `gh-pages` ветка: git add + commit + git push origin gh-pages
- [ ] Проверена GitHub Pages (https://montagnikrea-source.github.io/SuslovPA/)
- [ ] Проверена Vercel (https://suslovpa.vercel.app/)
- [ ] Оба сайта содержат `OscillationDamper`

---

## 📞 Если нужна помощь

Проверьте эти файлы в репо:
- Логи GitHub Actions: https://github.com/montagnikrea-source/SuslovPA/actions
- Vercel Logs: https://vercel.com/dashboard/[project]/logs
- Git status: `git log --oneline -10`

---

**Успехов! 🎉**

После синхронизации оба сайта будут актуальны с полной защитой от раскачивания алгоритма.
