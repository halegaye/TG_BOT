Sen kıdemli bir yazılım mimarı, senior full-stack TypeScript geliştiricisi, DevOps mühendisi, veritabanı uzmanı ve güvenlik mühendisi olarak çalışacaksın.

Benim için üretime alınabilir, güvenli, ölçeklenebilir ve ileride kolayca geliştirilebilir bir “Çoklu Telegram Bot Yönetim ve Bildirim Platformu” oluşturmanı istiyorum.

Bu sistem basit bir demo, mockup veya yalnızca arayüz prototipi olmayacak. Çalışan backend, çalışan frontend, PostgreSQL veritabanı, Redis kuyruk sistemi, Telegram webhook entegrasyonu, scheduler, worker servisleri, Docker yapılandırması, migration’lar, testler, seed verileri, kurulum dokümantasyonu ve üretim dağıtım talimatlarıyla birlikte eksiksiz bir proje olacak.

ÖNEMLİ ÇALIŞMA KURALLARI

1. Önce tüm gereksinimleri analiz et.
2. Gereksiz soru sormadan makul teknik kararları kendin al.
3. Hiçbir temel fonksiyonu “sonra yapılacak” diyerek boş bırakma.
4. TODO, placeholder, sahte servis veya çalışmayan örnek kod bırakma.
5. Kodları yalnızca açıklamakla kalma; gerçek dosyaları oluştur.
6. Her aşamada mevcut projeyi bozmayacak şekilde ilerle.
7. Her büyük aşamadan sonra:

* yapılanları,
* oluşturulan dosyaları,
* çalıştırılacak komutları,
* test sonuçlarını,
* varsa kalan sorunları
açıkça raporla.
8. Projeyi parçalara ayır fakat sonunda bütün parçalar birlikte çalışsın.
9. Güvenlik, veri bütünlüğü, idempotency, yetkilendirme ve hata kurtarma en baştan uygulanmalı.
10. Kullanacağın paketlerin güncel ve kararlı sürümlerini resmi dokümanlarından doğrula.
11. Paket sürümlerini sabitle ve package-lock.json oluştur.
12. Sistem Ubuntu 24.04 LTS üzerinde Docker Compose ile kurulabilir olmalı.
13. Geliştirme ve production yapılandırmalarını ayır.
14. Tüm tarih ve saat işlemlerini veritabanında UTC tut.
15. Panelde varsayılan saat dilimi Europe/Belgrade olsun fakat marka bazında değiştirilebilsin.
16. Arayüz dili ilk aşamada Türkçe olsun. Yazılımın i18n altyapısı ileride farklı panel dilleri eklenebilecek şekilde hazırlansın.
17. Telegram mesajlarında Unicode ve Türkçe karakter desteği eksiksiz çalışsın.
18. Sistem Mini App içermeyecek.
19. Telegram mesajlarında yalnızca normal Telegram yönlendirme butonları kullanılacak.
20. Kullanıcıya gönderilecek mesajların mevzuata, Telegram kurallarına ve kullanıcının iletişim tercihlerine uygun şekilde kullanılabilmesi için abonelikten çıkma, engellenme ve iletişim sıklığı kontrollerini destekle.

PROJE AMACI

Tek bir merkezi panel üzerinden 1.000’den fazla Telegram botunu yönetmek istiyorum.

Her bot için ayrı uygulama veya ayrı kopyalanmış kod çalıştırılmayacak. Bütün botlar ortak bir kod tabanında ve merkezi bir altyapıda çalışacak.

Yeni bir bot eklemek için temel olarak Telegram bot tokeni girilecek. Sistem:

* tokeni Telegram API üzerinden doğrulayacak,
* bot kimliğini,
* bot kullanıcı adını,
* bot görünen adını,
* bot profil bilgilerini
otomatik alacak,
* botu seçilen markaya bağlayacak,
* benzersiz ve güvenli webhook adresi oluşturacak,
* Telegram webhook’unu secret token ile kuracak,
* webhook durumunu doğrulayacak,
* botu aktif kullanıma hazırlayacak.

HEDEFLENEN MİMARİ

Monorepo kullan.

Önerilen yapı:

* apps/web: Next.js yönetim paneli
* apps/api: NestJS REST API
* apps/worker: BullMQ Telegram gönderim workerları
* apps/scheduler: zamanlama ve kampanya üretim servisi
* packages/database: Prisma şeması, migration ve seed
* packages/shared: ortak tipler, DTO’lar ve doğrulamalar
* packages/ui: tekrar kullanılabilir panel bileşenleri
* packages/config: merkezi ve tip güvenli yapılandırma
* packages/telegram: Telegram API istemcisi ve ortak servisler

Teknolojiler:

* TypeScript strict mode
* Node.js güncel LTS
* Next.js App Router
* NestJS
* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* REST API
* OpenAPI/Swagger
* Zod veya class-validator ile giriş doğrulaması
* React Query/TanStack Query
* Tailwind CSS
* Erişilebilir ve responsive arayüz
* Docker ve Docker Compose
* Nginx reverse proxy
* Let’s Encrypt uyumlu HTTPS yapılandırması
* Jest
* Supertest
* Playwright
* ESLint
* Prettier

Mümkün olduğunca ücretsiz ve açık kaynak paketler kullan.
Ücretli BullMQ Pro özelliklerine bağımlı olma. Bot başına hız sınırlamasını açık kaynak BullMQ, Redis ve uygulama seviyesinde güvenli bir mekanizmayla uygula.

SERVİS SINIRLARI

1. Web paneli
Kullanıcıların sistemi yönettiği arayüz.

2. API
Kimlik doğrulama, botlar, markalar, kullanıcılar, segmentler, mesaj şablonları, kampanyalar, raporlar ve sistem ayarları.

3. Webhook receiver
Telegram güncellemelerini mümkün olduğunca hızlı kabul etmeli.
Ağır işlemleri webhook isteği içinde yapmamalı.
Gelen güncellemeyi doğrulayıp kısa sürede HTTP 200 dönmeli.
Gerekli işlemleri kuyruğa aktarmalı.

4. Scheduler
Zamanı gelen kampanya çalıştırmalarını üretmeli.
Aynı zamanlama için ikinci kez kampanya çalıştırması oluşturmamalı.

5. Worker
Mesaj gönderimlerini işleme, Telegram limitlerini yönetme, tekrar deneme ve sonucu kaydetme.

6. Analytics aggregation
Ham olaylardan saatlik ve günlük özet tablolar üretmeli.

ÇOKLU MARKA YAPISI

Sistem gerçek bir multi-tenant yapı kullanacak.

Hiyerarşi:

Ana sistem

* Marka

* Botlar
* Bot grupları
* Telegram kullanıcıları
* Kullanıcı segmentleri
* Mesaj şablonları
* Kampanyalar
* Personeller
* Raporlar
* Marka ayarları

Kurallar:

* Her veri kaydı uygun tenant/brand ID ile ayrılmalı.
* Marka personeli başka markanın hiçbir verisini görememeli.
* Super Admin bütün markaları görebilmeli.
* Marka yöneticisi yalnızca izin verilen markaları görebilmeli.
* Aynı personel birden fazla markaya farklı rollerle atanabilmeli.
* Aynı Telegram botu aynı anda iki farklı markaya bağlanamamalı.
* Tüm API sorgularında tenant izolasyonu backend tarafından uygulanmalı.
* Tenant filtrelemesine frontend üzerinden güvenilmemeli.
* IDOR açıklarına karşı tüm kaynak erişimleri kontrol edilmeli.

MARKA AYARLARI

Her marka için:

* Marka adı
* Kısa kod
* Logo
* Varsayılan saat dilimi
* Varsayılan sessiz saatler
* Varsayılan kullanıcı frekans sınırı
* Varsayılan mesaj gönderim hızı
* Varsayılan yönlendirme alan adı
* Aktif/pasif durumu
* Marka rengi
* Marka yöneticileri
* Veri saklama tercihleri

BOT YÖNETİMİ

Bot ekleme ekranı:

* Telegram tokeni
* Marka seçimi
* Bot grupları/etiketleri
* Aktif/pasif
* Başlangıç mesajı
* Başlangıç mesajı parse mode seçimi
* Başlangıç mesajına eklenecek yönlendirme butonları
* Sessiz bildirim seçeneği
* Bot açıklama/not alanı

Token eklendiğinde:

1. Token biçimini doğrula.
2. Telegram getMe ile tokeni doğrula.
3. Bot kimliğini ve kullanıcı adını kaydet.
4. Tokenin daha önce eklenip eklenmediğini denetle.
5. Tokeni uygulama seviyesinde güçlü biçimde şifrele.
6. Veritabanında düz metin token saklama.
7. Panelde tokeni tekrar tam olarak gösterme.
8. Token son dört karakterini maskeleme amacıyla ayrı güvenli metadata olarak gösterebilirsin.
9. Bot için rastgele webhook path anahtarı oluştur.
10. Ayrı webhook secret token oluştur.
11. HTTPS webhook’u kur.
12. Webhook durumunu kontrol et.
13. Sonuç başarılıysa botu hazır duruma geçir.
14. Başarısız olursa anlaşılır hata göster ve işlemi geri alınabilir bırak.

Bot alanları:

* Internal ID
* Telegram bot ID
* Username
* Display name
* Encrypted token
* Token fingerprint/hash
* Webhook path secret
* Webhook header secret
* Marka ID
* Durum
* Sağlık durumu
* Varsayılan başlangıç mesajı
* Varsayılan butonlar
* Son webhook zamanı
* Son başarılı Telegram API isteği
* Son hata
* Toplam abone
* Aktif abone
* Engellenmiş kullanıcı
* Oluşturulma ve güncellenme tarihleri

Bot durumları:

* Taslak
* Kuruluyor
* Aktif
* Pasif
* Hatalı token
* Webhook hatası
* Telegram erişilemiyor
* Arşivlenmiş

Bot işlemleri:

* Bot ekle
* Düzenle
* Aktif/pasif yap
* Webhook’u yeniden kur
* Token değiştir
* Sağlık kontrolü yap
* Başlangıç mesajını düzenle
* Butonları düzenle
* Test mesajı gönder
* Botu başka gruba taşı
* Arşivle
* Sil

Bot silme işlemi doğrudan fiziksel silme yapmasın. Önce soft delete veya arşivleme yap. Fiziksel silme yalnızca Super Admin tarafından ayrıca onaylanabilsin.

BOT BAŞLANGIÇ MESAJI

Her botun kendi düzenlenebilir /start mesajı olacak.

Desteklenecek özellikler:

* Düz metin
* Telegram destekli HTML biçimi
* Telegram destekli MarkdownV2 biçimi
* Güvenli ön izleme
* Kullanıcı adı gibi izin verilen değişkenler:

* {{first_name}}
* {{last_name}}
* {{username}}
* {{bot_name}}
* {{brand_name}}
* {{start_parameter}}
* Tanımsız değişkenleri güvenli şekilde boş bırak veya validasyon hatası göster.
* Telegram karakter limitlerini gönderim öncesinde doğrula.
* Parse mode kaynaklı hataları önlemek için uygun escape fonksiyonları kullan.
* Başlangıç mesajı için sürüm geçmişi tut.
* Eski sürüme geri dönülebilsin.
* Değişiklik yapan personeli audit log’a kaydet.
* Mesaj ön izlemesi Telegram görünümüne yakın olsun.
* Gerçek bir test kullanıcısına test gönderimi yapılabilsin.

START PARAMETRESİ TAKİBİ

Şunları destekle:

t.me/botusername?start=campaign_x

Kullanıcı /start campaign_x gönderdiğinde:

* bot,
* marka,
* Telegram kullanıcı kimliği,
* start parametresi,
* ilk geliş zamanı,
* son geliş zamanı,
* ilk kaynak,
* son kaynak
kaydedilsin.

Aynı kullanıcı tekrar start gönderirse duplicate kullanıcı oluşturma.

Kullanıcı bazında bot üyeliği ayrı tutulmalı. Aynı Telegram kullanıcısı farklı botlarda ayrı abonelik ilişkilerine sahip olabilir.

YÖNLENDİRME BUTONLARI

Mini App olmayacak.

Başlangıç mesajlarında ve kampanya mesajlarında normal Telegram URL butonları kullanılacak.

Buton editörü:

* “+ Buton ekle”
* Buton adı
* Hedef URL
* Sıra numarası
* Satır numarası
* Aktif/pasif
* Takipli link kullan
* UTM parametreleri
* Yeni bir satıra ekle
* Aynı satırda göster
* Sil
* Sürükle-bırak sıralama

Buton adı ve linki panelden her zaman değiştirilebilmeli.

Bir mesajda birden fazla buton desteklensin.

Buton yerleşimi Telegram inline keyboard satır yapısına uygun olsun.

URL güvenliği:

* Yalnızca http ve https şemalarına izin ver.
* javascript:, data: ve zararlı şemaları reddet.
* Link uzunluğu validasyonu yap.
* İstenirse marka bazında izin verilen domain listesi uygulanabilsin.
* URL değişikliklerini audit log’a kaydet.
* Takipli link ile doğrudan link arasında seçim yapılabilsin.

TOPLU BOT EKLEME

CSV ile bot içe aktarma desteklensin.

CSV sütunları:

* token
* brand_code
* groups
* active
* start_message_template_name
* default_redirect_url
* notes

İçe aktarma süreci:

* Dosya ön doğrulaması
* Satır bazlı sonuç
* Duplicate token kontrolü
* Marka kontrolü
* Telegram token doğrulaması
* Webhook kurulumu
* Başarılı/başarısız sayıları
* Hatalı satırların CSV olarak dışa aktarılması
* İşlemin kuyruk üzerinden yapılması
* Aynı anda kontrolsüz yüzlerce Telegram isteği yapılmaması
* İşlem ilerleme göstergesi
* İçe aktarmayı iptal etme
* İçe aktarma audit log’u

BOT GRUPLARI VE ETİKETLERİ

Botları segmentlemek için:

* Bot grubu
* Bot etiketi
* Marka
* Aktif/pasif
* Açıklama

Bir bot birden fazla gruba ve etikete bağlanabilsin.

Kampanya hedefleme seçenekleri:

* Tüm marka botları
* Belirli botlar
* Belirli bot grupları
* Belirli bot etiketleri
* Grupların birleşimi
* Seçilen botları hariç tutma
* Pasif ve sağlıksız botları otomatik hariç tutma

TELEGRAM KULLANICI YÖNETİMİ

Kullanıcı bilgileri:

* Telegram user ID
* Chat ID
* Bot ID
* Marka ID
* Username
* First name
* Last name
* Language code
* Start parametresi
* İlk start zamanı
* Son start zamanı
* Son etkileşim
* Abonelik durumu
* Engellenme durumu
* Hata sayısı
* Son gönderim zamanı
* Günlük mesaj sayısı
* Saatlik mesaj sayısı
* Manuel etiketler
* Özel alanlar
* Oluşturulma ve güncellenme zamanı

Kullanıcı durumları:

* Aktif
* Pasif
* Botu engelledi
* Chat bulunamadı
* Kara listede
* İletişimden çıkarıldı
* Geçici hata

Telegram API aşağıdaki kalıcı hataları döndürdüğünde kullanıcıyı uygun duruma geçir:

* bot blocked
* user deactivated
* chat not found
* forbidden

Geçici ağ hatalarında kullanıcıyı kalıcı pasife alma.

Kullanıcıların panelden aranması:

* Telegram ID
* Chat ID
* Username
* İsim
* Bot
* Marka
* Etiket
* Segment
* Başlangıç kaynağı
* Tarih aralığı
* Durum

Kullanıcı verilerini CSV olarak dışa aktarma yetkiye bağlı olsun.

KULLANICI SEGMENTASYONU

İki segment türü olsun:

1. Dinamik segment
2. Statik segment
Dinamik segmentlerde kural oluşturucu kullan.

Desteklenecek temel koşullar:

* Bot
* Marka
* Bot grubu
* Bot etiketi
* Kullanıcı durumu
* Start parametresi
* İlk start tarihi
* Son start tarihi
* Son etkileşim tarihi
* Son tıklama tarihi
* Son X günde start verdi
* Son X günde tıklama yaptı
* Hiç tıklama yapmadı
* Belirli kampanyaya tıkladı
* Belirli etikete sahip
* Belirli etikete sahip değil
* Dil kodu
* Manuel VIP etiketi
* Botu engellememiş
* Son X saatte mesaj almamış
* Günlük mesaj sınırına ulaşmamış

AND ve OR koşulları desteklensin.

İlk sürümde sınırsız iç içe kural yerine kontrollü, anlaşılır iki seviyeli kural grupları yeterlidir.

Segment ekranı:

* Segment adı
* Açıklama
* Marka
* Kurallar
* Tahmini kullanıcı sayısı
* Son hesaplanma zamanı
* Yeniden hesapla
* Örnek kullanıcıları göster
* Aktif/pasif
* Kampanya kullanım sayısı

Dinamik segment sayımı ağır sorgular oluşturmasın.

Gerekli indeksleri oluştur.

Büyük segmentler için önbelleklenmiş üyelik veya snapshot yaklaşımı kullan.

Kampanya başlatıldığı anda hedef segmentin değişmez snapshot’ını oluştur. Kampanya devam ederken segment üyeliği değişse bile aynı çalıştırmanın hedef kitlesi değişmesin.

MESAJ ŞABLONLARI

Marka bazında tekrar kullanılabilir mesaj şablonları oluştur.

Şablon alanları:

* Ad
* Açıklama
* Marka
* Mesaj metni
* Parse mode
* Medya türü
* Medya referansı
* Butonlar
* Değişkenler
* Aktif/pasif
* Versiyon
* Oluşturan personel
* Onay durumu

Mesaj türleri:

İlk çalışan sürümde zorunlu:

* Metin
* Metin + URL butonu
* Görsel + caption + URL butonu

Video ve doküman gönderim altyapısını genişletilebilir şekilde tasarla fakat ilk arayüzde isteğe bağlı olarak devre dışı bırakılabilir.

Telegram’a aynı görseli tekrar göndermek için mümkün olduğunda Telegram file_id değerini sakla ve tekrar kullan. Her gönderimde dosyayı yeniden yükleme.

KAMPANYA YÖNETİMİ

Kampanya alanları:

* Kampanya adı
* Açıklama
* Marka
* Kampanya türü
* Öncelik
* Hedef bot seçimi
* Hedef kullanıcı segmenti
* Hariç tutulan botlar
* Hariç tutulan segmentler
* Mesaj varyasyonları
* Mesaj rotasyonu
* A/B test ayarları
* Zamanlama
* Sessiz saat davranışı
* Frekans sınırı davranışı
* Takip linkleri
* Durum
* Onay bilgileri
* Oluşturan
* Onaylayan
* Başlangıç
* Bitiş
* Sonraki çalışma
* Son çalışma
* Kampanya sürümü

Kampanya durumları:

* Taslak
* Onay bekliyor
* Onaylandı
* Zamanlandı
* Aktif
* Duraklatıldı
* Tamamlandı
* İptal edildi
* Hatalı
* Arşivlendi

Kampanya işlemleri:

* Oluştur
* Düzenle
* Taslak kaydet
* Ön izleme
* Test gönderimi
* Tahmini alıcı hesapla
* Onaya gönder
* Onayla
* Reddet
* Zamanla
* Şimdi gönder
* Duraklat
* Devam ettir
* İptal et
* Çoğalt
* Arşivle
* Sonuçları görüntüle

Kampanya gönderilmeye başladıktan sonra hedef kitleyi veya mesajı sessizce değiştirme.

Aktif kampanyada değişiklik gerekiyorsa:

* kampanyayı duraklat,
* yeni sürüm oluştur,
* değişikliği onaylat,
* kalan alıcılara yeni sürümün uygulanıp uygulanmayacağını açıkça seçtir.

ZAMANLAMA SİSTEMİ

Desteklenecek zamanlamalar:

* Şimdi gönder
* Tek seferlik tarih ve saat
* Her saat başı
* Her X saatte bir
* Her gün belirli saatte
* Her gün birden fazla seçilmiş saatte
* Haftanın belirli günlerinde
* Her hafta
* Her ayın belirli gününde
* Başlangıç tarihi
* Bitiş tarihi
* Süresiz tekrar
* Belirli tekrar sayısı
* Özel cron ifadesi yalnızca ileri düzey yetkili kullanıcılar için

Arayüzde normal kullanıcıya cron gösterme. İnsan tarafından anlaşılabilir zamanlama oluşturucu kullan.

Her zamanlama için panelde bir sonraki en az beş çalışma zamanını ön izleme olarak göster.

DST ve saat dilimi değişikliklerini doğru yönet.

Veritabanında UTC sakla, kullanıcıya marka saat diliminde göster.

Scheduler birden fazla kopya çalışsa bile aynı kampanya çalıştırmasını iki kez oluşturmamalı.

Bunun için:

* benzersiz schedule occurrence anahtarı,
* transaction,
* unique constraint,
* distributed lock
kullan.

SINIRSIZ BİLDİRİM OLUŞTURMA

Panelde “+ Yeni Kampanya” ve kampanya içinde “+ Mesaj Varyasyonu” seçenekleri olsun.
Uygulama seviyesinde makul bir üst sınır uygulanabilir fakat kullanıcı açısından çok sayıda taslak ve aktif kampanya oluşturulabilsin.

Aynı anda çok fazla kampanya çakışırsa:

* öncelik,
* frekans sınırı,
* sessiz saat,
* bot başına rate limit,
* kuyruk kapasitesi
kuralları uygulanmalı.

MESAJ ROTASYONU

Kampanya içinde birden fazla mesaj bulunabilsin.

Rotasyon seçenekleri:

* Sırayla
* Kullanıcı bazında sabit
* Rastgele
* Ağırlıklı rastgele
* Saat aralığına göre
* Günlere göre

Rotasyon ile A/B testi birbirinden ayrılmalı.

Mesaj rotasyonunda temel amaç aynı kullanıcının sürekli aynı metni görmesini engellemektir.

Kullanıcı bazında rotasyon geçmişini gereksiz büyütmeden sakla. Gerekiyorsa deterministik hash veya küçük bir cursor kullan.

A/B TESTİ

Destekle:

* A ve B varyasyonu
* İstenirse en fazla dört varyasyon
* Yüzde dağılımı
* Toplam yüzde 100 doğrulaması
* Kullanıcı bazında sabit varyasyon
* Bot bazında sabit varyasyon seçeneği
* Test başlangıç ve bitiş süresi
* Kontrol grubu
* Sonuç raporu

Bir kullanıcı aynı kampanya boyunca aynı varyasyonda kalmalı.

Atamayı deterministik ve tekrar üretilebilir şekilde:

hash(campaign_id + campaign_version + user_membership_id)

mantığıyla yap.

A/B test metrikleri:

* Hedeflenen
* Başarılı gönderim
* Başarısız gönderim
* Tekil tıklama
* Toplam tıklama
* CTR
* Takip edilen dönüşüm varsa dönüşüm sayısı
* Dönüşüm oranı

İlk sürümde otomatik istatistiksel kazanan seçimi zorunlu değil. Sonuçları açık biçimde göster.

GÖNDERİM ÖNCESİ TAHMİN

Kampanya aktif edilmeden önce mutlaka tahmin ekranı göster:

* Seçilen marka
* Seçilen bot sayısı
* Sağlıklı bot sayısı
* Hariç tutulan bot sayısı
* Segmentteki toplam üyelik
* Duplicate temizlendikten sonraki tahmini alıcı
* Frekans sınırına takılacak kullanıcı
* Sessiz saat nedeniyle ertelenecek kullanıcı
* Engellenmiş/pasif kullanıcı
* Gönderilebilir tahmini kullanıcı
* Bot bazında tahmini kullanıcı
* Yaklaşık tamamlanma süresi
* Kuyrukta mevcut iş sayısı
* Aynı zamana denk gelen kampanya sayısı
* Potansiyel çakışma uyarısı

Bu ekran yalnızca tahmin olduğunu açıkça belirtmeli.

Tahmin hesaplaması panel isteğini uzun süre bloklamasın. Büyük veride arka plan görevi oluşturup sonucu panelde göster.

TAHMİNİ TAMAMLANMA SÜRESİ

Her botun güvenli gönderim hızı, kullanıcı sayısı ve mevcut kuyruğu dikkate alınsın.

Varsayılan olarak bot başına güvenli bir hız kullan:

* Örneğin 20–25 mesaj/saniye.
* Marka veya sistem bazında değiştirilebilir olsun.
* Telegram 429 ve retry_after döndürürse dinamik olarak yavaşlasın.
* Limit asla yalnızca frontend üzerinden uygulanmasın.

GÖNDERİM KUYRUĞU

BullMQ kullan.

Ayrı kuyruklar veya açıkça ayrılmış job tipleri:

* telegram-webhook-events
* campaign-scheduler
* campaign-expansion
* telegram-send
* telegram-retry
* analytics-events
* link-events
* imports
* maintenance

Bir kampanya çalıştırması doğrudan milyonlarca işi aynı transaction içinde üretmesin.

Chunk/batch yaklaşımı kullan:

* kampanya çalıştırması,
* hedef snapshot,
* bot bazında batch,
* kullanıcı bazında gönderim işi.

Kuyruk üretiminde veritabanını ve Redis’i aşırı yüklemeyecek bir pagination/cursor sistemi kullan.

BOT BAŞINA RATE LIMIT

Her botun Telegram limiti birbirinden bağımsız yönetilmeli.

Tek global rate limit bütün botları yavaşlatmamalı.

Ücretsiz açık kaynak araçlarla bot anahtarına göre dağıtılmış rate limit uygula.

Örnek yaklaşım:

* Redis Lua script,
* token bucket veya leaky bucket,
* bot_id bazlı anahtar,
* saniyelik limit,
* burst sınırı,
* 429 durumunda bot bazlı geçici bekleme.

Aynı chat’e kısa sürede birden fazla mesaj gönderme riskine karşı chat bazlı minimum aralık kontrolü de uygula.

429 yanıtında:

* retry_after değerini oku,
* yalnızca ilgili bot veya ilgili chat akışını durdur,
* işi failed saymak yerine uygun zamana ertele,
* sonsuz hızlı retry döngüsü oluşturma.

TEKRAR GÖNDERİM KORUMASI

Bu kritik bir gereksinimdir.

Aynı kampanya mesajının aynı kullanıcıya yanlışlıkla iki kez gitmesini engelle.

Her mantıksal gönderim için benzersiz idempotency key oluştur:
campaign_run_id + message_variant_id + bot_membership_id

Veritabanında unique constraint kullan.

Gönderim kaydı durumları:

* Pending
* Queued
* Processing
* Sent
* Deferred
* RateLimited
* RetryScheduled
* PermanentlyFailed
* Cancelled
* SkippedFrequencyCap
* SkippedQuietHours
* SkippedInactive

Worker crash olsa bile aynı işi tekrar aldığında daha önce gönderilmiş kaydı kontrol et.

Telegram API çağrısı ile veritabanı güncellemesi arasındaki belirsizliği dikkate al. Tam olarak once-only teslim garantisi mümkün olmadığı için pratikte duplicate riskini minimuma indirecek bir delivery state machine tasarla.

Job ID’lerini idempotency key ile ilişkilendir.

Kampanya çalıştırma, batch ve gönderim seviyelerinde ayrı idempotency koruması uygula.

RETRY POLİTİKASI

Hataları sınıflandır:

1. Kalıcı kullanıcı hatası

* Kullanıcıyı pasifleştir.
* Retry yapma.

2. Geçici Telegram hatası

* Exponential backoff + jitter.
* Sınırlı retry.

3. 429 rate limit

* Telegram’ın söylediği süre kadar bekle.
* Bot bazlı limiter uygula.

4. Ağ hatası

* Retry.

5. Geçersiz token

* Botu unhealthy yap.
* O botun gönderimlerini durdur.
* Yöneticilere uyarı oluştur.

6. Geçersiz mesaj biçimi

* Kampanya/bot mesajını hatalı duruma getir.
* Aynı hatayı binlerce kullanıcı için tekrar deneme.
* Circuit breaker mantığı uygula.

Retry sayısı, son hata ve bir sonraki deneme zamanı kaydedilsin.

FREKANS SINIRI

Üç seviyede frekans kontrolü olsun:

* Sistem seviyesi
* Marka seviyesi
* Kampanya seviyesi

Örnek kurallar:

* Kullanıcı başına saatte en fazla X mesaj
* Kullanıcı başına günde en fazla X mesaj
* İki mesaj arasında en az X dakika
* Belirli kampanya kategorisi için günlük limit
* Acil kampanya bu sınırı aşabilir seçeneği

Hiyerarşi:

* Sistem sınırı aşılamaz.
* Marka sınırı sistem sınırını aşamaz.
* Kampanya sınırı marka sınırını aşamaz.
* Super Admin’e kontrollü override yetkisi verilebilir.
* Override işlemi mutlaka ayrı onay ve audit log gerektirir.

Frekans hesapları yarış koşullarına dayanıklı olsun.

Redis sayaçları ve kalıcı veritabanı olayları birlikte kullanılabilir.

Kullanıcıya mesaj gönderilmeden hemen önce son kontrol worker içinde yapılmalı. Yalnızca kampanya oluşturma anındaki tahmine güvenme.

SESSİZ SAATLER

Marka ve kampanya bazında sessiz saatler:

* Başlangıç saati
* Bitiş saati
* Saat dilimi
* Haftanın günleri
* Aktif/pasif

Davranış seçenekleri:

* Sessiz saat bitince gönder
* Bu çalıştırmayı atla
* Kampanyayı iptal et
* Acil kampanya olarak sessiz saatleri aş

Geceyi aşan aralıkları destekle:

23:00–08:00

Sessiz saat ertelemesinde aynı mesajın tekrar planlanması duplicate oluşturmamalı.

Ertelenen mesaj kampanyanın bitiş tarihinden sonraya kalıyorsa belirlenen kurala göre atlanmalı.

ACİL DURUM DURDURMA SİSTEMİ

Panelde görünür fakat yalnızca yetkili kişilerce kullanılabilir acil durdurma kontrolleri olsun:

* Tüm sistem gönderimlerini durdur
* Marka gönderimlerini durdur
* Belirli botu durdur
* Belirli kampanyayı durdur
* Yalnızca yeni kampanyaları durdur
* Kuyruktaki işleri de durdur

Emergency stop durumları Redis ve PostgreSQL’de tutulmalı.

Worker her mesajdan önce ilgili stop durumunu hızlı şekilde kontrol etmeli.

Acil durdurma:

* Tek onay değil, yüksek riskli işlem olduğu için açık ve güçlü onay modalı kullansın.
* Kullanıcıdan “DURDUR” gibi bir doğrulama metni yazmasını isteyebilir.
* İşlemi yapan kullanıcıyı, zamanı ve kapsamı audit log’a kaydet.
* Durdurma sonrası mevcut job’ların durumunu güvenli biçimde yönet.
* Devam ettirme işlemi de onay gerektirsin.

ONAY MODALLARI

Kullanıcının isteğine göre panelde veri değiştiren işlemlerin tamamı en az bir onay adımı göstermeli.

Örnek işlemler:

* Bot ekleme
* Bot tokeni değiştirme
* Botu pasifleştirme
* Botu silme/arşivleme
* Başlangıç mesajını değiştirme
* Buton linkini değiştirme
* Kampanyayı başlatma
* Kampanyayı zamanlama
* Kampanyayı durdurma
* Kampanyayı iptal etme
* Kampanyayı silme
* Segment silme
* Kullanıcı oluşturma
* Rol değiştirme
* Şifre sıfırlama
* 2FA sıfırlama
* Marka silme
* Yedekten geri dönme
* Emergency stop
* Toplu içe aktarma
* Toplu dışa aktarma

Fakat kullanıcı deneyimini gereksiz yere bozma.

Salt okunur işlemler için onay isteme.

Her modal:

* İşlemin adını
* Etkilenecek kaydı
* Sonucu
* Geri alınabilir olup olmadığını
* Risk seviyesini
göstersin.

Yüksek riskli işlemlerde kullanıcının kayıt veya marka adını yazması istenebilir.

Backend, yalnızca frontend modalı gösterildi diye işlemi güvenli kabul etmemeli. Yetkiyi tekrar doğrulamalı.

KULLANICI, PERSONEL VE KİMLİK YÖNETİMİ

Panel kullanıcıları için tam yönetim sistemi oluştur.

Kullanıcı alanları:

* Ad
* Soyad
* E-posta
* Kullanıcı adı
* Durum
* Roller
* Marka erişimleri
* 2FA durumu
* Son giriş
* Son IP
* Başarısız giriş sayısı
* Kilitlenme zamanı
* Şifre değişim zamanı
* Oluşturan
* Oluşturulma tarihi

Fonksiyonlar:

* Kullanıcı oluştur
* Davet bağlantısı gönder
* İlk şifre belirleme
* Şifre değiştir
* Yönetici tarafından şifre sıfırla
* Şifremi unuttum
* Kullanıcıyı aktif/pasif yap
* Hesabı kilitle/aç
* Oturumları sonlandır
* Bütün cihazlardan çıkış yap
* 2FA kur
* 2FA doğrula
* 2FA sıfırla
* Recovery code oluştur
* Recovery code yenile
* Rol ata
* Marka erişimi ata
* Kullanıcı silme yerine pasifleştirme/arşivleme
* Giriş geçmişini görüntüle
* Aktif oturumları görüntüle

KİMLİK DOĞRULAMA

Güvenli session yaklaşımı kullan.

Tercih:

* Kısa ömürlü access token
* Rotating refresh token
* Refresh token hash’lerini veritabanında saklama
* HttpOnly
* Secure
* SameSite uygun cookie
* CSRF koruması
* Oturum iptali
* Cihaz/oturum listesi

JWT kullanacaksan tarayıcı localStorage içinde uzun ömürlü JWT saklama.

Şifreler Argon2id ile hash’lensin.

Güçlü şifre politikası:

* Minimum uzunluk
* Yaygın parola kontrolü için temel önlem
* Kullanıcı adı/e-posta ile aynı olamama
* Rate limit
* Brute-force kilidi
* Güvenli reset tokeni
* Reset tokeni tek kullanımlık ve kısa ömürlü

2FA:

* TOTP
* QR kod
* Manuel secret
* Recovery code
* Secret şifreli saklama
* 2FA sıfırlamasında yüksek riskli onay
* Sıfırlama audit log’u
* Başka Super Admin varsa kritik sıfırlamada çift onay altyapısına uygun tasarım

İlk Super Admin yalnızca seed veya güvenli CLI komutuyla oluşturulsun. Varsayılan üretim şifresi kaynak kodda bulunmasın.

ROL VE YETKİLENDİRME

RBAC + gerektiğinde ince yetkiler kullan.

Başlangıç rolleri:

1. Super Admin
2. Sistem Yöneticisi
3. Marka Yöneticisi
4. Kampanya Yöneticisi
5. Editör
6. Analist
7. Sadece Görüntüleme

İzin örnekleri:

* brands.view
* brands.create
* brands.update
* brands.archive
* bots.view
* bots.create
* bots.update
* bots.rotate_token
* bots.archive
* bots.health
* users.view
* users.export
* segments.manage
* campaigns.create
* campaigns.edit
* campaigns.approve
* campaigns.send
* campaigns.cancel
* campaigns.view_stats
* panel_users.manage
* roles.manage
* audit.view
* backups.manage
* emergency_stop.system
* emergency_stop.brand
* settings.manage

İzinler backend guard/policy katmanında uygulanmalı.

Kullanıcıya özel izin ekleme/çıkarma desteklenebilir.

Yetki değişikliği aktif oturumlara kısa sürede yansısın.

Kendi yetkisini yükseltme engellensin.

Son Super Admin’in kendi Super Admin rolünü kaldırması engellensin.

ONAY AKIŞI

Kampanya onay süreci:

* Editör taslak oluşturur.
* Yetkili kullanıcı onaya gönderir.
* Onaylama yetkisi olan kullanıcı inceler.
* Gerekirse reddeder ve açıklama yazar.
* Onaylanan kampanya zamanlanabilir.
* Kampanya içeriği değişirse onay geçersiz olur ve tekrar onay gerekir.

Kendi oluşturduğu kampanyayı onaylama seçeneği marka ayarına bağlı olsun.

Yüksek güvenlik modunda four-eyes principle uygulanabilsin.

KAMPANYA LİNK TAKİBİ

Kısa takip linki üret:

https://go.example.com/{shortCode}

Takip linkinde:

* Marka
* Kampanya
* Kampanya çalıştırması
* Mesaj varyasyonu
* Bot
* Kullanıcı üyeliği
* Buton
ile ilişki kurulabilsin.

Güvenlik:

* Kullanıcı veya Telegram kimliklerini URL’de açık olarak gösterme.
* Tahmin edilemez kısa kod kullan.
* Kod çakışmasını engelle.
* Hedef URL sunucu tarafında doğrulansın.
* Open redirect oluşturma.
* Arşivlenen/kapatılan link davranışı ayarlanabilsin.
* Tıklamayı kaydettikten sonra hızlı 302/307 yönlendirme yap.
* Takip servisi, ağır rapor sorgularını request içinde çalıştırmasın.
* Bot ve kötü trafik için temel rate limit uygula.

Kaydedilecek metrikler:

* Toplam tıklama
* Tekil tıklama
* İlk tıklama
* Son tıklama
* Kampanya
* Varyasyon
* Buton
* Bot
* Marka
* Zaman
* Temel user-agent cihaz sınıfı
* Referer varsa
* Gerekliyse anonimleştirilmiş IP hash

Gizlilik açısından tam IP adresini gereksiz yere kalıcı saklama. Saklanacaksa yapılandırılabilir retention ve yetki kontrolü uygula.

İsteğe bağlı conversion endpoint altyapısı hazırla:

* S2S postback
* İmzalı istek
* idempotency key
* conversion type
* amount ve currency opsiyonel
* dış sistem event ID
* duplicate conversion koruması

Fakat ilk panelde bu özellik “deneysel/opsiyonel” olarak kapalı olabilir.

GELİŞMİŞ İSTATİSTİKLER

Dashboard:

* Toplam marka
* Toplam bot
* Aktif bot
* Sağlıksız bot
* Toplam aktif Telegram aboneliği
* Bugünkü yeni aboneler
* Bugün gönderilen
* Başarılı
* Başarısız
* Kuyrukta
* Rate limited
* Aktif kampanya
* Bugünkü tekil tıklama
* CTR
* Son 24 saat sistem hataları

Filtreler:

* Tarih aralığı
* Marka
* Bot
* Bot grubu
* Kampanya
* Segment
* Varyasyon

Kampanya raporu:

* Hedef
* Snapshot sayısı
* Queued
* Sent
* Failed
* Skipped
* Deferred
* Tekil tıklama
* Toplam tıklama
* CTR
* Bot bazında sonuç
* Saat bazında sonuç
* Varyasyon karşılaştırması
* Hata dağılımı
* Ortalama gönderim süresi
* Tamamlanma süresi

Bot raporu:

* Abone sayısı
* Yeni aboneler
* Engelleyenler
* Gönderim başarısı
* Tıklama oranı
* Son webhook
* Son hata
* Kuyruk gecikmesi

İstatistik performansı:

* Her dashboard açılışında dev ham tablolarda COUNT çalıştırma.
* Saatlik ve günlük aggregation tabloları oluştur.
* Kritik gerçek zamanlı sayaçları Redis’te tut ve PostgreSQL’e periyodik yaz.
* Ham event tablolarına doğru indeksler ekle.
* Tarihe göre partitioning gereksinimini ileride kolay eklenebilir tasarla.
* Retention politikası ekle.
* Büyük listelerde cursor pagination kullan.
* CSV dışa aktarmayı arka plan işi yap.

BOT SAĞLIK MERKEZİ

Tek bir sağlık merkezi ekranı oluştur.

Her bot için:

* Token geçerli mi?
* getMe başarılı mı?
* Webhook URL doğru mu?
* Secret doğrulanıyor mu?
* Pending update sayısı
* Son webhook zamanı
* Son başarılı mesaj
* Son hata
* Son 1 saat hata oranı
* Son 24 saat gönderim başarısı
* Kuyruk gecikmesi
* Rate limit durumu
* Aktif kullanıcı
* Botun durumu

Sağlık seviyeleri:

* Healthy
* Warning
* Critical
* Disabled
* Unknown

Otomatik sağlık kontrolleri:

* Belirli aralıklarla
* Kontrollü concurrency ile
* 1.000 botun tamamına aynı saniyede istek atma
* Jitter kullan
* Kritik hata oluştuğunda panel içi alarm üret
* İsteğe bağlı e-posta/webhook alarm altyapısı genişletilebilir olsun

Hızlı aksiyonlar:

* Webhook’u yenile
* Botu durdur
* Test gönder
* Token değiştir
* Hata detayını aç

SİSTEM SAĞLIK EKRANI

* API durumu
* Worker durumu
* Scheduler durumu
* PostgreSQL bağlantısı
* Redis bağlantısı
* Kuyruk derinlikleri
* En eski bekleyen iş yaşı
* Başarısız job sayısı
* CPU/RAM için uygulamanın görebildiği temel metrikler
* Son yedek
* Disk kullanımı için host entegrasyonuna uygun endpoint
* Uygulama sürümü
* Migration durumu

Prometheus uyumlu /metrics endpoint oluştur.

Kritik endpointleri halka açık bırakma; metrics erişimini ağ veya kimlik doğrulama ile sınırla.

AUDIT LOG

Değişiklik yapan tüm panel kullanıcılarını kaydet.

Audit alanları:

* Kullanıcı
* Marka
* Eylem
* Kaynak türü
* Kaynak ID
* Önceki değer
* Yeni değer
* IP
* User agent
* Request ID
* Tarih
* Başarı/başarısızlık
* Hata özeti

Hassas alanları loglama:

* Telegram tokeni
* Parola
* 2FA secret
* Refresh token
* Tam recovery code

Bu alanları redact et.

Audit log panelden değiştirilememeli veya silinememeli.

Retention politikası yalnızca yüksek yetkili tarafından yönetilebilsin.

YEDEKLEME

Yedekleme paneli ve otomatik backup scriptleri oluştur.

Gereksinimler:

* Günlük PostgreSQL backup
* Sıkıştırılmış backup
* Şifreli backup seçeneği
* Yerel saklama süresi
* Harici S3-compatible storage desteği
* Başarılı/başarısız yedek kaydı
* Dosya boyutu
* Checksum
* Başlangıç/bitiş zamanı
* Retention temizliği
* Yedek testi
* Geri yükleme dokümantasyonu

Panelde:

* Son yedekler
* Durum
* Boyut
* Başlatan
* Otomatik/manuel
* İndirme yetkisi
* Yeni manuel yedek başlat
* Restore talebi

Üretim restore işlemini web panelinden tek tıkla doğrudan çalıştırmak risklidir.

Daha güvenli yaklaşım:

* Panel restore talebi ve doğrulanmış backup seçimi oluşturur.
* Yüksek riskli onay ister.
* Bakım moduna geçme uyarısı verir.
* Gerçek restore için güvenli CLI komutu veya ayrı yönetim prosedürü sağlar.
* Restore işleminden önce otomatik pre-restore backup alır.
* Restore testleri için staging prosedürü yaz.

Redis’i ana veri kaynağı olarak görme. Kritik durumlar PostgreSQL’de tutulmalı. Redis kaybedilse bile sistem veritabanından güvenli biçimde yeniden oluşturulabilmeli.

GÜVENLİK

Telegram token saklama:

* AES-256-GCM veya eşdeğer authenticated encryption
* Her kayıt için rastgele IV
* Encryption key environment variable veya secret manager üzerinden
* Key version alanı
* İleride key rotation desteği
* Token fingerprint ile duplicate kontrolü
* Tokenleri loglama
* API response’larında göstermeme

Webhook güvenliği:

* HTTPS
* Tahmin edilemez bot webhook yolu
* Telegram secret header doğrulaması
* Bot ID ve path ilişkisinin kontrolü
* Request body limiti
* Rate limit
* Hızlı yanıt
* Replay ve duplicate update kontrolü
* Telegram update_id bazlı idempotency

Panel güvenliği:

* CSP
* HSTS
* X-Content-Type-Options
* Referrer-Policy
* Secure cookies
* CSRF
* XSS koruması
* SQL injection’a karşı parametrik ORM sorguları
* DTO validation
* Mass assignment koruması
* Rate limit
* Login brute-force koruması
* Hassas endpointlerde yeniden kimlik doğrulama
* Dosya yükleme boyut ve MIME kontrolü
* CSV injection koruması
* SSRF koruması
* Open redirect koruması
* Güvenli hata mesajları
* Request ID
* Structured logging

Kişisel veriler:

* Gereksiz veri toplama
* Silme/anonymization prosedürü
* Veri retention ayarları
* Telegram kullanıcı export işlemlerinde yetki ve audit
* Kara liste ve iletişimden çıkma desteği

LOGGING

Pino gibi yapılandırılmış JSON logging kullan.

Loglarda:

* request_id
* job_id
* campaign_id
* campaign_run_id
* bot_id
* brand_id
* error_code
* duration
bulunabilsin.

Hassas bilgileri redact et.

Production’da console’a düz metin token veya mesaj alıcı listesi yazma.

VERİTABANI TASARIMI

Aşağıdaki modelleri veya eşdeğerlerini tasarla:

* Brand
* BrandSetting
* PanelUser
* PanelUserSession
* PasswordResetToken
* TwoFactorCredential
* RecoveryCode
* Role
* Permission
* UserRole
* BrandMembership
* AuditLog
* TelegramBot
* BotHealthCheck
* BotGroup
* BotGroupMembership
* BotTag
* BotTagAssignment
* TelegramUser
* BotSubscriber
* SubscriberTag
* SubscriberTagAssignment
* StartEvent
* DynamicSegment
* SegmentRule
* StaticSegmentMember
* SegmentSnapshot
* SegmentSnapshotMember veya ölçeklenebilir eşdeğeri
* MessageTemplate
* MessageTemplateVersion
* MessageButton
* Campaign
* CampaignVersion
* CampaignTarget
* CampaignSchedule
* CampaignMessageVariant
* CampaignRun
* CampaignRunBot
* Delivery
* DeliveryAttempt
* ClickLink
* ClickEvent
* ConversionEvent
* ImportJob
* ImportJobRow
* BackupRecord
* SystemSetting
* EmergencyStop
* Notification/Alert
* HourlyMetric
* DailyMetric

Şemayı körü körüne bu listeyle sınırlama. Gerekli ara modelleri ekle.

Her tabloda uygun:

* primary key,
* foreign key,
* unique constraint,
* index,
* tenant field,
* created_at,
* updated_at,
* soft delete alanı
kullan.

Çok büyük olması beklenen tablolarda UUID yerine performans ve dağıtım ihtiyaçlarını değerlendir. Dışarıya açılan ID’lerde tahmin edilmesi zor kimlikler kullan.

Teslimat ve event tabloları için uygun birleşik indeksler tasarla.

N+1 sorgularını engelle.

Transaction gerektiren işlemleri belirle.

DATABASE MIGRATION

* Prisma migration’ları oluştur.
* İlk seed:

* izinler,
* varsayılan roller,
* örnek marka yalnızca development ortamında,
* test botu olmadan demo kayıtları
eklesin.
* Production Super Admin oluşturmak için güvenli CLI komutu yaz.
* Migration rollback stratejisini dokümante et.
* Büyük migration’larda kilit riskini belirt.

PANEL SAYFALARI

1. Giriş
2. 2FA doğrulama
3. Şifremi unuttum
4. Şifre sıfırlama
5. Dashboard
6. Markalar
7. Marka detay ve ayarları
8. Botlar
9. Bot ekle
10. Toplu bot içe aktar
11. Bot detay
12. Bot başlangıç mesajı editörü
13. Bot sağlık merkezi
14. Telegram kullanıcıları
15. Kullanıcı detay
16. Bot grupları
17. Bot etiketleri
18. Kullanıcı etiketleri
19. Segmentler
20. Segment oluşturucu
21. Mesaj şablonları
22. Kampanyalar
23. Kampanya oluşturma sihirbazı
24. Kampanya ön izleme ve tahmin
25. Kampanya detay
26. Kampanya canlı durum
27. Kampanya raporu
28. A/B test raporu
29. Link takibi
30. İstatistikler
31. Panel kullanıcıları
32. Kullanıcı oluşturma
33. Roller ve izinler
34. Audit log
35. Sistem sağlığı
36. Kuyruk durumu
37. Uyarılar
38. Yedeklemeler
39. Sistem ayarları
40. Profil
41. Şifre değiştirme
42. 2FA yönetimi
43. Aktif oturumlar

ARAYÜZ TASARIMI

* Temiz
* Modern
* Profesyonel
* Karanlık ve aydınlık tema
* Masaüstü öncelikli fakat mobil uyumlu
* Karmaşık ekranlarda anlaşılır adım adım sihirbaz
* Türkçe metinler
* Form validasyonları
* Skeleton/loading durumları
* Empty state
* Hata state
* Başarı bildirimleri
* Erişilebilir modal ve kontroller
* Klavye erişimi
* Arama
* Filtre
* Sıralama
* Cursor pagination
* Tablo kolonlarını gizleme
* CSV export
* Tarih/saatleri marka saat diliminde gösterme

Silme ve kritik işlem butonları normal birincil butonlarla aynı görünmesin.

Kampanya oluşturma sihirbazı:

1. Marka ve kampanya bilgisi
2. Bot hedefleme
3. Kullanıcı segmenti
4. Mesaj ve butonlar
5. Rotasyon/A-B testi
6. Zamanlama
7. Frekans ve sessiz saatler
8. Link takibi
9. Tahmini alıcı
10. Ön izleme
11. Onay
12. Zamanlama/başlatma

Test mesajı gönderirken panel kullanıcısının önceden tanımlanmış Telegram test chat ID’si veya yetkili biçimde girilen chat ID kullanılabilsin.

API TASARIMI

REST endpointlerini modüler oluştur.

* Versioned API: /api/v1
* Swagger/OpenAPI
* Standart hata formatı
* Request ID
* Cursor pagination
* Filtre ve sorting sözleşmesi
* Idempotency-Key desteği, özellikle:

* kampanya başlatma,
* toplu içe aktarma,
* manuel yedek,
* webhook kurma,
* kritik mutasyonlar
* Optimistic concurrency veya version alanı
* Stale update koruması

API response’larında token, secret ve hassas alanlar bulunmasın.

TELEGRAM WEBHOOK İŞLEMLERİ

İlk sürümde zorunlu update türleri:

* message
* /start
* callback_query gerekliyse yalnızca geleceğe uyumluluk için
* my_chat_member veya gönderim hatalarıyla birlikte bot engelleme durumlarını anlamaya yardımcı gerekli güncellemeler

Allowed updates listesini gereksiz update’leri almamak için yapılandır.

Webhook handler:

1. Path botunu bul.
2. Secret header’ı constant-time karşılaştırmayla doğrula.
3. Payload’u doğrula.
4. Telegram update_id duplicate kontrolü yap.
5. Olayı hızlıca kuyruğa yaz.
6. Hemen 200 dön.
7. Background consumer kullanıcı ve start bilgilerini upsert etsin.
8. /start mesajını ilgili botun güncel ayarından oluştursun.
9. Değişkenleri güvenli biçimde uygulasın.
10. URL butonlarını oluştursun.
11. Frekans sınırının başlangıç mesajına uygulanıp uygulanmayacağını marka ayarından belirle.
12. Gönderim sonucunu kaydet.

Başlangıç mesajı kampanya bildirimlerinden ayrı bir mesaj kategorisi olsun.

BİR BOTTA AYAR DEĞİŞTİRME

Bot başlangıç mesajı veya buton linki değiştirildiğinde yeni /start verenler yeni sürümü görsün.

Geçmiş mesajları Telegram üzerinde geri dönük düzenlemeye çalışma.

Bot ayarları versiyonlansın.

Değişiklik sonrası:

* Ön izleme
* Test gönderimi
* Onay modalı
* Kaydetme
* Audit log
* Gerekirse onay akışı
uygulansın.

BİLDİRİM VE UYARI MERKEZİ

Panel içi uyarılar:

* Bot tokeni geçersiz
* Webhook hatası
* Yüksek başarısızlık oranı
* Kuyruk gecikmesi
* Yedek başarısız
* Disk riski
* Kampanya tamamlandı
* Kampanya kısmen başarısız
* İçe aktarma tamamlandı
* Emergency stop etkin
* Çok fazla 429
* Scheduler heartbeat eksik
* Worker heartbeat eksik

Uyarılar:
* okunmuş/okunmamış,
* önem seviyesi,
* marka,
* bağlantılı kaynak,
* oluşturulma tarihi
içersin.

HEARTBEAT

API, scheduler, worker ve analytics servisleri periyodik heartbeat yazsın.

Panel son heartbeat üzerinden servis sağlığını göstersin.

Worker kapanırsa scheduler kampanya üretmeye devam ederek sınırsız kuyruk şişirmesin. Kuyruk derinliği koruma eşiği ve backpressure uygula.

BAKIM MODU

* Sistem bakım modu
* Marka bakım modu
* Yalnızca gönderimleri durdur
* Panel erişimini sınırlama
* Super Admin erişimi
* Kullanıcıya bakım uyarısı

DEPLOYMENT

Docker Compose servisleri:

* nginx
* web
* api
* worker
* scheduler
* analytics-worker
* postgres
* redis

Development ve production compose dosyalarını ayır.

Production’da:

* PostgreSQL ve Redis portlarını internete açma.
* API yalnızca Nginx üzerinden erişilsin.
* Healthcheck ekle.
* Restart policy ekle.
* Resource limit örnekleri ekle.
* Persistent volumes kullan.
* Log rotation yapılandır.
* Graceful shutdown uygula.
* Worker kapanırken aktif job’ları güvenli bırak.
* Database migration işlemini kontrollü entrypoint veya deployment komutuyla yap.
* Secrets .env.example içinde yalnızca isim olarak yer alsın.
* Gerçek secret commit edilmesin.

Nginx:

* HTTPS yönlendirmesi
* Webhook endpointi
* Panel
* API
* Tracking redirect domaini
* Request body limit
* Güvenlik başlıkları
* Rate limiting
* Proxy timeout ayarları

DOMAIN ÖRNEĞİ

* panel.example.com
* api.example.com
* hooks.example.com
* go.example.com

Tek domain path bazlı kullanım da desteklenebilir.

SUNUCU HEDEFİ

Başlangıç sunucusu:

* 8 vCPU
* 16 GB RAM
* 200–300 GB NVMe
* 1 Gbps bağlantı
* Ubuntu 24.04 LTS

İlk aşamada servislerin hepsi aynı makinede Docker ile çalışabilir.

Ancak mimari ileride kolayca şu şekilde ayrılabilmeli:

* Web/API sunucusu
* PostgreSQL sunucusu
* Redis sunucusu
* Birden fazla worker sunucusu
* Tracking redirect sunucusu

Servisleri localhost varsayımlarına sıkı bağlama.

OBSERVABILITY

* Structured logs
* Prometheus metrics
* Health endpoints
* Queue metrics
* Error tracking entegrasyonuna uygun yapı
* Request süreleri
* Telegram API latency
* Mesaj başarı oranı
* Bot başına rate-limit sayısı
* Retry sayısı
* Dead-letter mantığı
* Scheduler lag
* Worker lag
* Database query süreleri

ADMIN CLI KOMUTLARI

Güvenli CLI komutları oluştur:

* create-super-admin
* rotate-encryption-key plan/helper
* test-database
* test-redis
* check-bot-token
* setup-bot-webhook
* check-all-webhooks
* pause-system
* resume-system
* trigger-backup
* verify-backup
* aggregate-metrics
* requeue-safe-failed-jobs

CLI çıktılarında token gösterme.

TESTLER

Unit test:

* Segment kural değerlendirmesi
* Zamanlama hesaplaması
* Sessiz saat
* Frekans sınırı
* A/B assignment
* Mesaj rotasyonu
* Değişken interpolation
* URL validation
* Token encryption
* Permission checks
* Idempotency key
* Retry classification

Integration test:

* Authentication
* 2FA
* Marka izolasyonu
* Bot ekleme
* Webhook doğrulama
* /start işleme
* Kampanya oluşturma
* Kampanya onayı
* Kampanya çalıştırma
* Delivery duplicate koruması
* Rate limit
* Emergency stop
* Backup record
* CSV import

E2E test:

* Super Admin giriş
* Marka oluşturma
* Personel oluşturma
* Bot ekleme, Telegram API mock ile
* Başlangıç mesajı oluşturma
* Segment oluşturma
* Kampanya hazırlama
* Tahmini alıcı
* Onay
* Zamanlama
* Kampanyayı durdurma
* Audit log kontrolü

Telegram API için testlerde gerçek token gerektirmeyen mock server veya adapter kullan.

Adapter interface tasarla:

* TelegramApiClient
* RealTelegramApiClient
* MockTelegramApiClient

TEST KALİTESİ

* Kritik iş kurallarında yüksek coverage
* Testler deterministik
* Zaman testlerinde fake clock
* Queue testlerinde ayrı Redis database veya test container
* Tenant izolasyonu için negatif testler
* Yetkisiz erişim testleri
* Duplicate webhook testleri
* Duplicate campaign run testleri
* Worker crash senaryosu
* 429 senaryosu
* Geçersiz parse mode senaryosu
* Bozuk token senaryosu

DOKÜMANTASYON

Aşağıdaki belgeleri oluştur:

* README.md
* docs/architecture.md
* docs/database.md
* docs/security.md
* docs/telegram-integration.md
* docs/campaign-lifecycle.md
* docs/queue-and-retries.md
* docs/backup-and-restore.md
* docs/deployment-ubuntu.md
* docs/scaling.md
* docs/troubleshooting.md
* docs/operator-guide-tr.md
* docs/api.md
* docs/disaster-recovery.md

README içeriği:

* Proje amacı
* Mimari
* Gereksinimler
* Development kurulumu
* Environment variables
* Migration
* Seed
* Super Admin oluşturma
* Test çalıştırma
* Docker çalıştırma
* Telegram bot ekleme
* Production kurulum özeti

ENVIRONMENT VARIABLES

Eksiksiz .env.example oluştur.

Örnek kategoriler:

* NODE_ENV
* APP_URL
* PANEL_URL
* API_URL
* WEBHOOK_BASE_URL
* TRACKING_BASE_URL
* DATABASE_URL
* REDIS_URL
* SESSION_SECRET
* JWT secrets gerekiyorsa
* TOKEN_ENCRYPTION_KEY
* TOKEN_ENCRYPTION_KEY_VERSION
* COOKIE_DOMAIN
* SMTP ayarları
* S3 backup ayarları
* LOG_LEVEL
* RATE LIMIT ayarları
* DEFAULT_TIMEZONE
* BACKUP_RETENTION_DAYS
* METRICS_AUTH
* INITIAL_ADMIN_EMAIL yalnızca kontrollü bootstrap gerekiyorsa

.env.example içinde gerçek değer veya zayıf production secret verme.

E-POSTA

Şifre sıfırlama ve kullanıcı daveti için SMTP abstraction hazırla.

Development ortamında Mailpit veya log tabanlı güvenli mail preview kullanılabilir.

E-posta gönderilemezse kullanıcı oluşturma işlemi kaybolmasın; davet durumu panelde görünsün ve yeniden gönderilebilsin.

İLK SÜRÜM ÖNCELİKLENDİRMESİ

Bütün mimari yukarıdaki kapsamı desteklesin. Ancak çalışan ilk sürümü aşağıdaki sırayla tamamla:

FAZ 1 – Temel altyapı

* Monorepo
* PostgreSQL
* Redis
* Docker
* NestJS
* Next.js
* Authentication
* 2FA
* RBAC
* Çoklu marka
* Audit log
* Temel panel tasarımı

FAZ 2 – Telegram bot altyapısı

* Token ile bot ekleme
* Token şifreleme
* Webhook
* Secret doğrulama
* /start
* Kullanıcı kaydı
* Başlangıç mesajı
* Düzenlenebilir URL butonları
* Test gönderimi
* Bot sağlık kontrolü

FAZ 3 – Kampanya altyapısı

* Bot grupları
* Kullanıcı segmentleri
* Mesaj şablonları
* Kampanya oluşturma
* Tek sefer ve tekrarlı zamanlama
* BullMQ
* Worker
* Rate limit
* Retry
* Duplicate koruması
* Frekans sınırı
* Sessiz saat
* Tahmini alıcı
* Emergency stop

FAZ 4 – Gelişmiş özellikler

* Mesaj rotasyonu
* A/B testi
* Takipli link
* İstatistik aggregation
* Gelişmiş raporlar
* Toplu bot ekleme
* CSV export
* Uyarı merkezi
* Yedekleme paneli

FAZ 5 – Sertleştirme

* Tüm testler
* Güvenlik kontrolü
* Performans indeksleri
* Load test senaryoları
* Backup/restore testi
* Production Nginx
* Ubuntu deployment dokümanı
* Monitoring
* Disaster recovery

FAZLAR ARASINDAKİ KURAL

Bir faz tamamlanmadan sonraki faza geçme.

Her faz sonunda:

1. TypeScript build çalıştır.
2. Lint çalıştır.
3. Unit testleri çalıştır.
4. Integration testleri çalıştır.
5. Docker servislerini ayağa kaldır.
6. Health endpointlerini kontrol et.
7. Migration durumunu kontrol et.
8. Hataları düzelt.
9. Bana sonuç özeti ver.

MİNİMAL BAŞLANGIÇ PRENSİBİ

Sistemin arayüzü ve kullanımı sade tutulmalı fakat veritabanı ve mimari sonradan büyütmeye uygun olmalı.

İlk sürümü gereksiz mikroservis karmaşasına boğma.

Başlangıçta monorepo içinde ayrı process/container yaklaşımı kullan.

Domain sınırlarını temiz tut.

Özellikleri kapatıp açabilmek için feature flag altyapısı ekle:

* AB_TESTING
* ADVANCED_ANALYTICS
* TRACKING_LINKS
* BULK_IMPORT
* BACKUPS_UI
* APPROVAL_WORKFLOW

Bu özellikler kodda çalışır halde olsun fakat gerektiğinde panelden veya environment ayarından kapatılabilsin.

KABUL KRİTERLERİ

Sistem tamamlandığında aşağıdaki senaryo baştan sona çalışmalı:

1. Ubuntu sunucuda Docker Compose çalıştırılır.
2. PostgreSQL ve Redis ayağa kalkar.
3. Migration tamamlanır.
4. CLI ile Super Admin oluşturulur.
5. Super Admin panele giriş yapar.
6. 2FA kurar.
7. Yeni marka oluşturur.
8. Marka yöneticisi oluşturur.
9. Telegram bot tokeni ekler.
10. Token doğrulanır.
11. Webhook otomatik kurulur.
12. Bot sağlıklı görünür.
13. Botun /start mesajı düzenlenir.
14. “Siteye Git” isminde URL butonu eklenir.
15. Kullanıcı Telegram’dan /start verir.
16. Kullanıcı veritabanına kaydolur.
17. Düzenlenen başlangıç mesajını ve butonu alır.
18. Panelde kullanıcı görünür.
19. Bot grubu oluşturulur.
20. Kullanıcı segmenti oluşturulur.
21. Bir kampanya oluşturulur.
22. Kampanyaya mesaj ve yönlendirme butonu eklenir.
23. Birden fazla bot veya grup seçilir.
24. Tahmini alıcı sayısı hesaplanır.
25. Günlük frekans limiti seçilir.
26. Sessiz saat seçilir.
27. Tek seferlik veya tekrarlı zamanlama yapılır.
28. Kampanya onaylanır.
29. Scheduler çalıştırmayı üretir.
30. Worker mesajları gönderir.
31. Aynı kullanıcıya duplicate gönderim oluşmaz.
32. Telegram 429 döndürürse sistem bekleyip yeniden dener.
33. Tıklamalar takip edilir.
34. Kampanya raporunda sonuçlar görünür.
35. Emergency stop gönderimleri durdurur.
36. Devam ettirme işlemi güvenli biçimde çalışır.
37. Bot sağlık merkezi sorunları gösterir.
38. Manuel backup alınır.
39. Audit log bütün önemli işlemleri gösterir.
40. Yetkisiz marka kullanıcısı başka marka verisine erişemez.

PERFORMANS HEDEFLERİ

İlk aşama için:

* 1.000+ kayıtlı bot
* Yüz binlerce bot aboneliği
* Çok sayıda zamanlanmış kampanya
* Aynı anda birden fazla kampanya
* Kontrollü milyonlarca günlük gönderime büyüyebilme
* Panel listelerinde hızlı filtre ve pagination
* Webhook’lara hızlı yanıt
* Worker sayısını artırarak yatay ölçekleme

Gerçek Telegram’a load test yapma.

Telegram adapter mock kullanarak:

* 1.000 bot
* 100.000 kullanıcı
* Çakışan kampanyalar
* 429 yanıtları
* Worker restart
* Redis geçici bağlantı sorunu
* PostgreSQL yavaşlığı
senaryolarını test edecek load test scriptleri oluştur.

TESLİM ŞEKLİ

Projeyi üretirken önce aşağıdakileri sun:

1. Nihai mimari kararı
2. Klasör yapısı
3. Veri modeli özeti
4. Kritik akış diyagramları
5. Güvenlik modeli
6. Faz planı
7. Kabul kriterlerinin teknik karşılığı

Ardından dosyaları oluşturmaya başla.

Yalnızca kod blokları paylaşmak yerine çalışma ortamındaki gerçek proje dosyalarını oluştur ve düzenle.

Her oluşturduğun modül diğer modüllerle uyumlu olsun.

Her fazın sonunda bana:

* tamamlanan özellikler,
* değişen dosyalar,
* çalıştırılan komutlar,
* test sonuçları,
* uygulamayı nasıl göreceğim,
* bir sonraki faz
başlıklarıyla rapor ver.

Bir sorunla karşılaşırsan projeyi yarım bırakma. Kök nedeni belirle, düzelt ve testleri tekrar çalıştır.

SON TEKNİK KARARLAR

* Mini App kesinlikle olmayacak.
* Her botun başlangıç mesajı panelden düzenlenebilir olacak.
* Başlangıç mesajına birden fazla düzenlenebilir URL butonu eklenebilecek.
* Buton adları ve linkleri sonradan kolayca değiştirilebilecek.
* Kampanya mesajlarında da düzenlenebilir URL butonları bulunacak.
* 1.000 bot için ayrı ayrı kod/process oluşturulmayacak.
* Merkezi webhook ve ortak kod tabanı kullanılacak.
* Bot tokenleri şifreli tutulacak.
* Panel kullanıcı yönetimi eksiksiz olacak.
* Şifre değiştirme ve sıfırlama olacak.
* TOTP 2FA ve 2FA sıfırlama olacak.
* Her kritik değişiklikte onay modalı olacak.
* Gönderim öncesi tahmini alıcı gösterilecek.
* Frekans sınırı olacak.
* Sessiz saatler olacak.
* Acil durdurma sistemi olacak.
* Tekrar gönderim koruması olacak.
* Bot sağlık merkezi olacak.
* Toplu bot ekleme olacak.
* Otomatik ve manuel yedekleme olacak.
* Kullanıcı segmentasyonu olacak.
* A/B testleri feature flag ile kullanılabilecek.
* Mesaj rotasyonu olacak.
* Gelişmiş istatistikler olacak.
* Rol ve personel yetkilendirmesi olacak.
* Çoklu marka olacak.
* Kampanya linki takibi olacak.
* Sistem ilk günden çalışabilir, sade ve yönetilebilir olacak.
* Mimari zamanla daha fazla bot, kullanıcı ve worker eklenerek büyütülebilecek.

Şimdi önce mimari tasarımı ve uygulama planını çıkar. Ardından FAZ 1’i gerçek dosyalar oluşturarak uygulamaya başla. FAZ 1 tamamlanmadan FAZ 2’ye geçme. Her aşamada projeyi çalıştır, test et ve raporla.


