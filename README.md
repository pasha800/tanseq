# Tanseq — سیستەمی هەماهەنگی

Tanseq سیستەمێکی فۆڕمی فەرمییە بۆ ئامادەکردنی نامەی هەماهەنگی بە زمانی کوردی/سۆرانی و ئاراستەی RTL. سیستەمەکە بۆ کارەکانی هەماهەنگی، تۆمارکردنی زانیاری گرێبەست، کرێکار، ئۆتۆمبێل، کەل و پەل، باج/Badge Card، پێشنمایشی نامە، کۆپی، چاپ و ناردن بە WhatsApp ئامادە کراوە.

## تایبەتمەندییە سەرەکییەکان

- فۆڕمی قۆناغ بە قۆناغ بۆ کەمکردنەوەی هەڵەی بەکارهێنەر
- UI ـی فەرمی، mobile-first، RTL و گونجاو بۆ سۆرانی
- پێشنمایشی زیندووی نامە لە کاتی پڕکردنەوەدا
- هەڵگرتنی draft لەسەر هەمان ئامێر بە `localStorage`
- validation بۆ خانە پێویستەکان، ڕێکەوت، کرێکار، ئۆتۆمبێل و کەل و پەل
- هەڵبژاردنی خێرای ڕێکەوت
- پشتیوانی جۆری ئۆتۆمبێل، مۆدێل، ڕەنگ و plate preview
- ناردن بە WhatsApp و کۆپی کردنی نامە
- print preview و شێوازی چاپی پاک و فەرمی
- بێ backend و بێ database؛ داتا تەنیا لە browser ـی بەکارهێنەر دەمێنێتەوە

## بەکارهێنان

فایلەکان static ـن. دەتوانرێت لە GitHub Pages یان هەر static hosting ـێکدا کار بکەن.

```text
index.html
styles.css
app.js
fonts/
```

### Login ـی دیمۆ

```text
Username: admin
Password: 12345
```

> تێبینی: ئەمە client-side login ـە و تەنیا بۆ سنووردارکردنی UI ـی browser ـە. بۆ بەکارهێنانی فەرمی و هەستیار، backend authentication پێویستە.

## Workflow ـی بەکارهێنەر

1. چوونەژوورەوە
2. هەڵبژاردنی جۆری هەماهەنگی
3. داخڵکردنی زانیاری گرێبەست و هێزی هاوپەیمانان
4. زیادکردنی کرێکار/ئۆتۆمبێل/کەل و پەل بەپێی جۆری هەماهەنگی
5. پێشنمایش، کۆپی، چاپ یان ناردن بە WhatsApp

## پاراستنی داتا

- هیچ داتابەیسێک نییە
- هیچ زانیارییەک بۆ server نانێردرێت
- draft تەنیا لە localStorage ـی هەمان browser هەڵدەگیرێت
- بۆ زانیاری هەستیار، پێش share کردن پێشنمایشەکە بپشکنە

## پێشنیاز بۆ production

- گۆڕینی login ـی client-side بۆ backend authentication
- زیادکردنی audit log و user roles
- هەڵگرتنی encrypted drafts ئەگەر داتا هەستیارە
- دانانی WhatsApp number و access policy لە config ـی جیاواز
- زیادکردنی automated tests بۆ validation و message generation

## Maintenance checklist

- هەموو جۆرەکانی هەماهەنگی تاقی بکەرەوە
- mobile و desktop پشکنە
- چاپکردن لە browser ـەکانی Chrome/Edge پشکنە
- localStorage draft restore پشکنە
- WhatsApp link و copy fallback پشکنە
- هەموو label ـەکانی باج/Badge Card لەگەڵ وشەسازی فەرمی یەکبخە
