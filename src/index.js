export default {
    async fetch(request, env, ctx) {
        if (request.method === 'POST') {
            try {
                const update = await request.json();

                // Xử lý khi có tin nhắn text mới
                if (update.message && update.message.text) {
                    const chatId = update.message.chat.id;
                    const text = update.message.text;

                    // Lấy token
                    const botToken = "8579597482:AAH214Cf1IbHUoSZsnpoMYnXjntyvTBfeiM";
                    if (!botToken) {
                        return new Response("Bot token chưa được cấu hình", { status: 500 });
                    }

                    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    const sendReply = async (messageText) => {
                        await fetch(telegramUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: chatId, text: messageText }),
                        });
                    };

                    // Lấy danh sách subscribers hiện tại
                    let subscribers = [];
                    const subsStr = await env.BOT_DATA.get("SUBSCRIBERS");
                    if (subsStr) {
                        subscribers = JSON.parse(subsStr);
                    }

                    // Xử lý các lệnh
                    if (text === '/start') {
                        await sendReply('Xin chào! Tôi là bot theo dõi App Store.\n\nGõ /subscribe để nhận thông báo cập nhật.\nGõ /unsubscribe để huỷ đăng ký.\nGõ /check để chủ động kiểm tra thông tin ứng dụng ngay lập tức.');
                    } else if (text === '/check') {
                        // Tính năng chủ động kiểm tra
                        const appId = env.APP_ID;
                        if (!appId) {
                            await sendReply('Chưa cấu hình APP_ID để theo dõi.');
                            return new Response('OK', { status: 200 });
                        }

                        try {
                            const appleApiUrl = `https://itunes.apple.com/lookup?id=${appId}`;
                            const response = await fetch(appleApiUrl);
                            const data = await response.json();

                            if (data.resultCount === 0) {
                                await sendReply(`Không tìm thấy App với ID ${appId} trên App Store.`);
                            } else {
                                const appInfo = data.results[0];
                                const replyMsg = `🔍 **Thông tin mới nhất từ App Store**\n\n` +
                                    `📱 Tên: **${appInfo.trackName}**\n` +
                                    `🆙 Phiên bản: ${appInfo.version}\n` +
                                    `📅 Ngày phát hành: ${new Date(appInfo.releaseDate).toLocaleDateString()}\n\n` +
                                    `📝 Ghi chú mới: ${appInfo.releaseNotes || 'Trống'}`;
                                await sendReply(replyMsg);
                            }
                        } catch (err) {
                            await sendReply('❌ Có lỗi xảy ra khi kiểm tra dữ liệu từ Apple. Vui lòng thử lại sau.');
                            console.error("Check Error:", err);
                        }
                    } else if (text === '/subscribe') {
                        if (!subscribers.includes(chatId)) {
                            subscribers.push(chatId);
                            await env.BOT_DATA.put("SUBSCRIBERS", JSON.stringify(subscribers));
                            await sendReply('✅ Bạn đã đăng ký nhận thông báo thành công!');
                        } else {
                            await sendReply('Bạn đã đăng ký nhận thông báo từ trước rồi.');
                        }
                    } else if (text === '/unsubscribe') {
                        if (subscribers.includes(chatId)) {
                            subscribers = subscribers.filter(id => id !== chatId);
                            await env.BOT_DATA.put("SUBSCRIBERS", JSON.stringify(subscribers));
                            await sendReply('❌ Bạn đã huỷ đăng ký nhận thông báo thành công!');
                        } else {
                            await sendReply('Bạn chưa đăng ký nhận thông báo.');
                        }
                    } else {
                        await sendReply(`Lệnh không hợp lệ. Vui lòng chat /start để xem hướng dẫn.`);
                    }
                }
                // Luôn trả về HTTP 200 để Telegram biết webhook đã nhận được
                return new Response('OK', { status: 200 });
            } catch (e) {
                console.error(e);
                // Gửi lỗi chi tiết về lại cho dễ debug
                return new Response(`Error processing update: ${e.message}\nStack: ${e.stack}`, { status: 500 });
            }
        }

        // Nếu người dùng truy cập trực tiếp bằng trình duyệt
        return new Response('Bot Telegram Webhook Endpoint đang hoạt động!', { status: 200 });
    },

    async scheduled(event, env, ctx) {
        console.log("Running scheduled App Store check...");

        // Lấy token và APP_ID
        const botToken = "8579597482:AAH214Cf1IbHUoSZsnpoMYnXjntyvTBfeiM";
        const appId = env.APP_ID;

        if (!botToken || !appId) {
            console.error("Thiết lập môi trường bị thiếu (Token hoặc APP_ID).");
            return;
        }

        try {
            // Gọi Apple iTunes API để lấy thông tin app
            const appleApiUrl = `https://itunes.apple.com/lookup?id=${appId}`;
            const response = await fetch(appleApiUrl);
            const data = await response.json();

            if (data.resultCount === 0) {
                console.error(`Không tìm thấy App với ID ${appId}`);
                return;
            }

            const appInfo = data.results[0];
            const currentState = {
                version: appInfo.version,
                releaseDate: appInfo.releaseDate,
                releaseNotes: appInfo.releaseNotes || "Không có ghi chú phát hành.",
                price: appInfo.price,
                trackName: appInfo.trackName
            };

            // Đọc trạng thái cũ từ KV
            const previousStateStr = await env.BOT_DATA.get("APP_STATE");

            let hasChanged = false;
            let notificationMessage = "";

            if (!previousStateStr) {
                // Chạy lần đầu tiên
                hasChanged = true;
                notificationMessage = `🤖 **Bot Khởi Động**\nBắt đầu theo dõi thông tin ứng dụng: **${currentState.trackName}**\nPhiên bản hiện tại: ${currentState.version}`;
            } else {
                const previousState = JSON.parse(previousStateStr);

                // So sánh để tìm sự thay đổi
                if (currentState.version !== previousState.version || currentState.releaseDate !== previousState.releaseDate) {
                    hasChanged = true;
                    notificationMessage = `🔔 **Cập Nhật Ứng Dụng Mới!** 🔔\n\n` +
                        `📱 Tên: **${currentState.trackName}**\n` +
                        `🆙 Phiên bản: ${currentState.version} (Trước đó: ${previousState.version})\n` +
                        `📅 Ngày phát hành: ${new Date(currentState.releaseDate).toLocaleDateString()}\n\n` +
                        `📝 Ghi chú: ${currentState.releaseNotes}`;
                }
            }

            if (hasChanged) {
                console.log("App state changed, sending notifications...");

                // Lưu trạng thái mới vào KV
                await env.BOT_DATA.put("APP_STATE", JSON.stringify(currentState));

                // Lấy danh sách những người đã subscribe
                const subsStr = await env.BOT_DATA.get("SUBSCRIBERS");
                if (subsStr) {
                    const subscribers = JSON.parse(subsStr);
                    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

                    // Gửi thông báo cho từng người
                    for (const chatId of subscribers) {
                        try {
                            await fetch(telegramUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: chatId,
                                    text: notificationMessage,
                                    parse_mode: "Markdown" // Hỗ trợ in đậm
                                }),
                            });
                        } catch (err) {
                            console.error(`Lỗi khi gửi thông báo tới ${chatId}:`, err);
                        }
                    }
                }
            } else {
                console.log("No changes detected in App state.");
            }

        } catch (error) {
            console.error("Lỗi khi kiểm tra App Store:", error);
        }
    },
};
