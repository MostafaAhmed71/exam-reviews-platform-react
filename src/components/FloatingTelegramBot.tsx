import { TelegramBotLink } from './TelegramBotLink';
import './FloatingTelegramBot.css';

/** زر عائم يظهر في كل الشاشات */
export function FloatingTelegramBot() {
    return (
        <div
            className="floating-telegram-bot"
            role="complementary"
            aria-label="بوت النخبة على تليجرام"
        >
            <div className="floating-telegram-bot__inner">
                <TelegramBotLink className="telegram-bot-link--fab" />
                <div className="floating-telegram-bot__hint" aria-hidden="true">
                    <span className="floating-telegram-bot__hint-title">بوت النخبة</span>
                    <span className="floating-telegram-bot__hint-text">
                        اضغط الأيقونة لفتح البوت على تليجرام — للطلاب المسجّلين في النخبة فقط، وليس
                        عامًّا للجميع.
                    </span>
                </div>
            </div>
        </div>
    );
}
