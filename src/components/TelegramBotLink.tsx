import './TelegramBotLink.css';

const DEFAULT_TELEGRAM_BOT_URL = 'https://t.me/nokbat_bot';

const FAB_ICON_SRC = '/8380003.jpg';

/** الرابط الافتراضي بوت النخبة؛ يمكن تجاوزه بـ `VITE_TELEGRAM_BOT_URL` في `.env` */
export function TelegramBotLink({ className = '' }: { className?: string }) {
    const url =
        (import.meta.env.VITE_TELEGRAM_BOT_URL ?? '').trim() || DEFAULT_TELEGRAM_BOT_URL;
    const isFab = className.includes('telegram-bot-link--fab');
    const title = 'بوت النخبة — خاص بطلاب النخبة فقط';

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            className={`telegram-bot-link ${className}`.trim()}
        >
            {isFab ? (
                <>
                    <img
                        src={FAB_ICON_SRC}
                        alt=""
                        className="telegram-bot-link__fab-icon"
                        width={56}
                        height={56}
                        decoding="async"
                    />
                    <span className="telegram-bot-link__sr-only">{title}</span>
                </>
            ) : (
                <>
                    <span className="telegram-bot-link__title">بوت النخبة</span>
                    <span className="telegram-bot-link__note">خاص بطلاب النخبة فقط</span>
                </>
            )}
        </a>
    );
}
