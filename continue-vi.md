# NHIỆM VỤ: HOÀN THIỆN FLUXTX TỪ TRẠNG THÁI HIỆN TẠI ĐẾN PRODUCTION-READY

## 1. Bối cảnh

Hiện tại dự án FluxTx chưa sẵn sàng production.

Các phần còn thiếu hoặc chưa được xác minh:

- Chưa có giao diện quản trị hoàn chỉnh.
- Chưa có hệ thống xác thực và phân quyền.
- Chưa có API thanh toán hoạt động thực tế.
- Chưa có blockchain indexer hoạt động thực tế.
- Chưa có hệ thống webhook hoàn chỉnh.
- Chưa có blockchain adapter nào được xác minh đầy đủ.
- Môi trường hiện tại chưa có Docker.
- Thư mục dự án hiện tại chưa phải Git repository.

Mục tiêu là biến FluxTx thành một nền tảng API thanh toán blockchain đa chuỗi thực sự hoạt động, có thể triển khai, kiểm thử và mở rộng.

**Không được chỉ tạo giao diện demo, mock API hoặc tài liệu mô tả rồi tuyên bố dự án đã hoàn thành.**

## 2. Nguyên tắc bắt buộc

### 2.1. Kiểm tra trước khi sửa

Trước tiên:

1. Kiểm tra toàn bộ cấu trúc thư mục.
2. Đọc các file cấu hình, package, source code và tài liệu hiện có.
3. Xác định công nghệ, framework và kiến trúc hiện tại.
4. Kiểm tra những chức năng đã triển khai và những chức năng còn thiếu.
5. Kiểm tra dependency, lỗi build, lỗi TypeScript và lỗi runtime.
6. Xác định các giới hạn của môi trường hiện tại.
7. Đưa ra kế hoạch triển khai cụ thể.

Không được mặc định dự án đang trống.

Không được xóa hoặc viết lại code hiện có nếu chưa thực sự cần thiết.

### 2.2. Áp dụng Karpathy Guidelines

Bắt buộc áp dụng:

https://github.com/multica-ai/andrej-karpathy-skills

Đọc và tuân thủ các nguyên tắc:

- Think Before Coding.
- Simplicity First.
- Surgical Changes.
- Goal-Driven Execution.

Nếu môi trường hỗ trợ Claude Code Skills hoặc plugin tương ứng, hãy sử dụng skill chính thức. Không giả vờ đã cài hoặc đã sử dụng skill nếu chưa xác minh.

### 2.3. Context Management

Nếu context sắp hết:

- Lưu tiến độ vào `IMPLEMENTATION_PLAN.md`.
- Cập nhật `TASKS.md`.
- Ghi rõ phase đã hoàn thành.
- Ghi rõ phase đang thực hiện.
- Ghi lại các file đã thay đổi.
- Ghi lại lỗi, vấn đề và quyết định kiến trúc.
- Ghi chính xác công việc tiếp theo.

Khi tiếp tục ở phiên mới:

1. Đọc `IMPLEMENTATION_PLAN.md`.
2. Đọc `TASKS.md`.
3. Kiểm tra lại source code thực tế.
4. Tiếp tục từ task chưa hoàn thành.
5. Không triển khai lại những phần đã hoàn thành.

Không được dừng ở việc viết kế hoạch nếu vẫn còn khả năng triển khai và kiểm thử.

## 3. Kiến trúc và công nghệ

Ưu tiên kiến trúc:

### Frontend

- React 19.
- TypeScript.
- Next.js.
- Tailwind CSS.
- shadcn/ui.
- Animate UI: https://animate-ui.com/
- Motion.
- Lucide Icons.

Yêu cầu giao diện:

- Modern SaaS dashboard.
- Minimal, chuyên nghiệp.
- Responsive.
- Dark mode và Light mode.
- Dashboard thống kê thanh toán.
- Quản lý API Keys.
- Quản lý invoices.
- Quản lý transactions.
- Quản lý webhooks.
- Quản lý blockchain networks.
- Quản lý merchant settings.
- Logs và monitoring.
- Developer documentation.

Không tạo dashboard chỉ có dữ liệu giả.

### Backend

Ưu tiên Cloudflare:

- Cloudflare Workers.
- Hono.
- Cloudflare D1.
- Cloudflare KV.
- Cloudflare Queues.
- Cloudflare Durable Objects.
- Cloudflare Cron Triggers.
- Cloudflare R2 khi cần.

Sử dụng binding được cấu hình trong Cloudflare Dashboard khi phù hợp.

Không giả định Workers có thể chạy tiến trình indexer liên tục như một máy chủ daemon.

Nếu cần tiến trình chạy dài hạn, hãy thiết kế indexer riêng hoặc mô hình hybrid có thể self-host.

### Database

Thiết kế database đầy đủ cho:

- Users.
- Organizations.
- Merchants.
- API keys.
- Sessions.
- Invoices.
- Payments.
- Transactions.
- Blockchain networks.
- Webhook endpoints.
- Webhook deliveries.
- API usage.
- Audit logs.
- Notification settings.

Có migration, indexes, constraints và quy trình backup phù hợp.

## 4. Xây dựng hệ thống xác thực

Triển khai thực tế:

- Đăng ký.
- Đăng nhập.
- Đăng xuất.
- Email verification.
- Password hashing an toàn.
- Session management.
- Password reset.
- Organization management.
- Role-based access control.
- API key authentication.

Không lưu mật khẩu dạng plaintext.

Không sử dụng tài khoản quản trị mặc định với mật khẩu cố định.

Không để lộ API key hoặc secret trong frontend, Git hoặc logs.

## 5. Xây dựng Payment API

Thiết kế REST API thực tế.

Các endpoint tối thiểu:

- `POST /v1/invoices`
- `GET /v1/invoices/:id`
- `GET /v1/invoices`
- `POST /v1/invoices/:id/expire`
- `GET /v1/payments`
- `GET /v1/transactions`
- `GET /v1/networks`
- `GET /v1/api-keys`
- `POST /v1/api-keys`
- `DELETE /v1/api-keys/:id`
- `GET /v1/webhooks`
- `POST /v1/webhooks`
- `GET /v1/webhooks/:id/deliveries`

Yêu cầu:

- API versioning.
- Request validation.
- Response schema nhất quán.
- Pagination.
- Filtering.
- Rate limiting.
- Idempotency keys.
- Error handling.
- Request IDs.
- API documentation.

Không trả về thành công nếu giao dịch chưa được xác minh trên blockchain.

## 6. Blockchain Indexer và Adapter

Đây là phần quan trọng nhất của FluxTx.

Xây dựng kiến trúc adapter độc lập để có thể mở rộng blockchain.

Các blockchain mục tiêu:

- Ethereum.
- BNB Smart Chain.
- Polygon.
- Arbitrum.
- Optimism.
- Base.
- Avalanche.
- TRON.
- Solana.

Bitcoin có thể được triển khai ở phase sau.

Hỗ trợ:

- Native token transfers.
- ERC-20.
- TRC-20.
- SPL tokens.
- USDT.
- USDC.

Không được giả định tất cả blockchain sử dụng cùng một cơ chế đọc giao dịch.

Mỗi adapter phải có:

- RPC client.
- Block scanning.
- Transaction parsing.
- Event/log parsing.
- Token transfer detection.
- Confirmation tracking.
- Finality handling.
- Reorganization handling khi áp dụng.
- Retry và backoff.
- Rate-limit handling.
- Duplicate detection.
- Checkpoint persistence.
- Health monitoring.

Phải sử dụng số nguyên hoặc decimal arithmetic chính xác. Không sử dụng JavaScript floating-point để xử lý số tiền thanh toán.

### Chính sách công bố hỗ trợ blockchain

Chỉ được công bố blockchain là `SUPPORTED` khi:

1. Adapter đã được triển khai.
2. Đọc và phân tích được dữ liệu blockchain thực tế.
3. Nhận diện chính xác giao dịch native token.
4. Nhận diện chính xác token transfer tương ứng.
5. Xử lý confirmation và finality.
6. Có cơ chế xử lý reorganization khi blockchain yêu cầu.
7. Payment matching hoạt động.
8. Idempotency được kiểm thử.
9. Integration tests đã chạy thành công trên testnet hoặc nguồn dữ liệu blockchain thực tế được xác minh.
10. Những giới hạn còn lại đã được ghi rõ.

Sử dụng các trạng thái:

- `SUPPORTED`: Đã triển khai và kiểm thử thực tế.
- `BETA`: Đã triển khai nhưng còn giới hạn.
- `IN_PROGRESS`: Đang phát triển.
- `PLANNED`: Chỉ nằm trong roadmap.
- `UNSUPPORTED`: Chưa hỗ trợ.

Không được đánh dấu blockchain là được hỗ trợ chỉ vì đã tạo file adapter hoặc thêm tên blockchain vào cấu hình.

Các trạng thái phải đồng nhất trên Dashboard, API, README và tài liệu.

## 7. Payment Matching Engine

Triển khai hệ thống đối chiếu giao dịch với invoice.

Yêu cầu:

- Invoice creation.
- Unique payment reference.
- Shared wallet hoặc unique deposit address tùy kiến trúc.
- Payment detection.
- Exact amount matching.
- Partial payment.
- Underpayment.
- Overpayment.
- Expired invoice.
- Duplicate transaction protection.
- Confirmation tracking.
- Reorganization recovery.
- Payment state machine.

Các trạng thái invoice:

- `PENDING`.
- `DETECTED`.
- `CONFIRMING`.
- `PAID`.
- `PARTIALLY_PAID`.
- `UNDERPAID`.
- `OVERPAID`.
- `EXPIRED`.
- `FAILED`.
- `REORGED`.

Không chuyển invoice sang `PAID` chỉ dựa vào dữ liệu từ frontend.

## 8. Webhook System

Triển khai webhook thực tế.

Các sự kiện:

- `invoice.created`.
- `payment.detected`.
- `payment.confirming`.
- `payment.completed`.
- `payment.failed`.
- `payment.expired`.
- `payment.reorged`.

Yêu cầu:

- HMAC-SHA256 signature.
- Timestamp validation.
- Retry với exponential backoff.
- Delivery history.
- Delivery status.
- Replay webhook.
- Idempotent event delivery.
- Timeout.
- Dead-letter handling.

Phải chống SSRF và không cho phép webhook gọi các địa chỉ nội bộ hoặc địa chỉ nguy hiểm.

## 9. Dashboard và Hosted Checkout

Xây dựng giao diện thực tế kết nối backend.

Dashboard cần:

- Overview.
- Total payments.
- Successful payments.
- Pending payments.
- Transaction volume.
- Network distribution.
- Recent transactions.
- API usage.
- Webhook status.

Hosted checkout:

- Hiển thị số tiền.
- Hiển thị blockchain.
- Hiển thị token.
- Hiển thị địa chỉ nhận.
- Hiển thị QR code.
- Hiển thị trạng thái thanh toán.
- Cập nhật trạng thái theo backend.
- Hiển thị thời gian hết hạn.

Không sử dụng dữ liệu mock trong production.

## 10. SDK và Developer Experience

Ưu tiên SDK:

- TypeScript.
- Python.
- PHP.
- Go.

Cung cấp:

- API reference.
- Quick start.
- Authentication guide.
- Create invoice example.
- Webhook verification example.
- Error codes.
- Rate limits.
- Supported blockchain list.

SDK phải gọi API thực tế, không chỉ là ví dụ giả lập.

## 11. Bảo mật

Kiểm tra:

- SQL injection.
- XSS.
- CSRF.
- SSRF.
- Authentication bypass.
- Authorization bypass.
- API key leakage.
- Webhook signature validation.
- Rate limiting.
- Replay attacks.
- Input validation.
- Sensitive information exposure.

FluxTx phải non-custodial theo mặc định.

Không bao giờ yêu cầu người dùng cung cấp seed phrase hoặc private key.

Không lưu private key của merchant.

Không tự ý thực hiện chuyển tiền.

## 12. Kiểm thử và Production Readiness

Bắt buộc có:

- Unit tests.
- Integration tests.
- API tests.
- Payment matching tests.
- Blockchain adapter tests.
- Webhook tests.
- Authentication tests.
- Database migration tests.
- Frontend tests.
- Build verification.

Kiểm tra:

- Production build.
- TypeScript.
- Lint.
- Environment variables.
- Database migrations.
- Cloudflare bindings.
- Deployment configuration.
- Error handling.
- Logging.
- Monitoring.

Không được bỏ qua lỗi build hoặc test rồi tuyên bố thành công.

## 13. Git và GitHub

Kiểm tra Git:

- Nếu chưa có Git repository, xác nhận thư mục hiện tại có đúng là project root rồi mới chạy `git init`.
- Không ghi đè Git repository có sẵn.
- Không tự ý thay đổi remote.
- Không commit secret hoặc file `.env`.
- Tạo `.gitignore`.
- Tạo README.
- Tạo LICENSE MIT.
- Tạo CONTRIBUTING.md.
- Tạo SECURITY.md.
- Tạo issue templates.
- Tạo pull request template.
- Tạo GitHub Actions CI.

Không tự ý push hoặc tạo repository công khai nếu chưa được cho phép.

## 14. Môi trường không có Docker

Không được xem việc thiếu Docker là lý do dừng toàn bộ dự án.

Thực hiện:

1. Kiểm tra các công cụ đã cài.
2. Kiểm tra Node.js, package manager và Wrangler.
3. Nếu có thể, sử dụng local development bằng Wrangler và các dịch vụ giả lập phù hợp.
4. Viết integration test không phụ thuộc Docker khi khả thi.
5. Ghi rõ các test cần Docker chưa thể chạy.
6. Cung cấp hướng dẫn cài đặt Docker Desktop cho Windows nếu thực sự cần.

Không được giả vờ Docker đã hoạt động.

Không được đánh dấu integration test là PASS nếu chưa chạy.

## 15. Kế hoạch triển khai

Chia công việc thành các phase:

**Phase 0 — Audit**
- Kiểm tra dự án.
- Kiểm tra source.
- Kiểm tra dependency.
- Kiểm tra môi trường.
- Tạo implementation plan.

**Phase 1 — Foundation**
- Hoàn thiện cấu trúc.
- Database.
- Migration.
- Authentication.
- API foundation.

**Phase 2 — Blockchain Core**
- Adapter architecture.
- RPC clients.
- Indexer.
- Transaction parser.
- Payment matching.

**Phase 3 — Payment API**
- Invoice API.
- Payment API.
- Idempotency.
- Webhook.

**Phase 4 — Dashboard**
- Authentication UI.
- Overview.
- Invoices.
- Transactions.
- API keys.
- Webhooks.
- Settings.

**Phase 5 — Checkout và SDK**
- Hosted checkout.
- QR code.
- SDK.
- Documentation.

**Phase 6 — Security và Testing**
- Security review.
- Automated tests.
- Integration tests.
- Load testing khi phù hợp.

**Phase 7 — Deployment**
- Cloudflare configuration.
- Database migration.
- Environment variables.
- Production build.
- Deployment guide.

Không được đánh dấu phase hoàn thành nếu các acceptance criteria chưa đạt.

## 16. Tiêu chí hoàn thành

FluxTx chỉ được xem là production-ready khi:

- Authentication hoạt động.
- Dashboard kết nối backend.
- API thanh toán hoạt động.
- Có ít nhất một blockchain adapter được xác minh thực tế.
- Indexer đọc được giao dịch thực tế.
- Payment matching chính xác.
- Webhook hoạt động.
- Database migration chạy thành công.
- API key và phân quyền hoạt động.
- Security tests đạt yêu cầu.
- Build và các test bắt buộc đạt.
- Có tài liệu triển khai đầy đủ.
- Không còn dữ liệu mock được sử dụng như dữ liệu production.
- Các giới hạn và blockchain chưa hỗ trợ được công bố minh bạch.

Nếu chưa đạt, phải ghi rõ `NOT PRODUCTION READY`.

## 17. Báo cáo sau mỗi phase

Sau mỗi phase, báo cáo:

1. Đã hoàn thành những gì.
2. Các file được tạo hoặc sửa.
3. Chức năng nào thực sự hoạt động.
4. Test nào đã chạy.
5. Kết quả test thực tế.
6. Lỗi còn tồn tại.
7. Công việc tiếp theo.
8. Những phần chưa thể xác minh.

Phân biệt rõ:

- Implemented.
- Tested.
- Verified.
- Not tested.
- Blocked.
- Planned.

Không được nói đã hoàn thành nếu mới chỉ tạo cấu trúc hoặc code khung.

---

## YÊU CẦU BẮT ĐẦU NGAY

Bắt đầu bằng Phase 0 — Audit.

Sau khi audit:

1. Tạo hoặc cập nhật `IMPLEMENTATION_PLAN.md`.
2. Tạo hoặc cập nhật `TASKS.md`.
3. Xác định các chức năng thiếu.
4. Sắp xếp thứ tự triển khai theo dependency.
5. Bắt đầu triển khai phase đầu tiên ngay trong workspace hiện tại.

Không chỉ trả lời bằng kế hoạch.

Không hỏi lại những thông tin có thể xác định từ source code hoặc môi trường.

Không xóa code hiện có.

Không tạo tính năng giả.

Không bỏ qua kiểm thử.

**Mục tiêu cuối cùng: một FluxTx thực sự hoạt động, có thể kiểm chứng, có thể triển khai và có thể được cộng đồng phát triển lâu dài.**