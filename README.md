# Mana11Lab

เครื่องมือเล็กๆ ใช้ฟรี ไม่มีโฆษณา — [mana11x.github.io/Labs](https://mana11x.github.io/Labs)

## Deploy

GitHub Pages serve จาก branch `gh-pages` ต้อง push ทั้งสอง branch ทุกครั้ง

```bash
git push origin main
git checkout gh-pages && git reset --hard main && git push origin gh-pages --force && git checkout main
```
