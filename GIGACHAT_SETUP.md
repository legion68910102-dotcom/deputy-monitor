# Подключение GigaChat API к версии v129

Код классификатора работает **на сервере GitHub Actions**, а не в браузере. Ключ нельзя добавлять в HTML, JavaScript страницы, README, Issues, комментарии, скриншоты или чат.

## Настройка
1. Создайте проект GigaChat API в кабинете [Sber Developers](https://developers.sber.ru/docs/ru/gigachat/individuals-quickstart) и скопируйте **Authorization key**.
2. В репозитории GitHub откройте **Settings → Secrets and variables → Actions → New repository secret**, укажите имя `GIGACHAT_AUTH_KEY`, а в значении — ключ авторизации GigaChat. Не добавляйте префикс `Basic`, если его нет в скопированном значении; скрипт обработает оба варианта.
3. Откройте **Actions → AI classification of deputy publications → Run workflow**. Запуск по расписанию сохранён: дважды в день. Автоматический запуск происходит также при изменении `vk-posts.json`.
4. Проверьте `ai-analysis.json`: поля `provider: "gigachat"`, `model`, `status`, `classified_posts`. На сайте откройте вкладку **🧠 Анализ**.

Модель по умолчанию — `GigaChat-2-Pro`. Для смены модели измените `GIGACHAT_MODEL` в workflow. Для физических лиц по умолчанию применяется `GIGACHAT_API_PERS`; при другом договоре и тарифе используйте `GIGACHAT_API_B2B` или `GIGACHAT_API_CORP` согласно документации.

## Что сохранено
- Все **13** категорий анализа, включая «Без темы» (её автоматически добавляет интерфейс при отсутствии классификаций).
- Объяснение, цитата из публикации, оценка уверенности, маркировка сомнительных случаев.
- Таблицы, рейтинг, Excel, карточки депутатов, фильтры и мобильный интерфейс.
- Fallback на локальные правила для публикаций без готового результата GigaChat.

## Ограничения
- Секрет GitHub Actions не передаётся в GitHub Pages, а личный импорт CSV хранится только в браузере. Эти публикации **не будут** анализироваться GigaChat, пока не появятся в общей серверной базе `vk-posts.json`.
- **VK API настраивается отдельно.** Если `vk-posts.json` пуст, GigaChat выдаст `no_posts`, и на сайте не появятся выдуманные публикации.
- Без `GIGACHAT_AUTH_KEY` классификация не запускается. Запросы к GigaChat не выполнялись и должны быть проверены после настройки секрета.
- Freemium для физлиц ограничен личным некоммерческим использованием. Для коммерческого использования проверьте действующие [условия GigaChat](https://developers.sber.ru/docs/ru/gigachat/tariffs/commercial).
- При ошибках API используйте журнал GitHub Actions. Скрипт не публикует ключ и не отключает проверку TLS-сертификатов.

[Авторизация GigaChat API](https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api) · [Структурированные ответы JSON](https://developers.sber.ru/docs/ru/gigachat/guides/structured-output)
