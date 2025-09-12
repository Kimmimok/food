-- 대기 테이블에 예약 관련 컬럼 추가
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS reservation_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_duration INTEGER DEFAULT 120, -- 분 단위
ADD COLUMN IF NOT EXISTS special_request TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_reservation BOOLEAN DEFAULT FALSE;

-- 예약 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_waitlist_reservation_time ON waitlist(reservation_time) WHERE is_reservation = TRUE;
CREATE INDEX IF NOT EXISTS idx_waitlist_status_reservation ON waitlist(status, is_reservation);