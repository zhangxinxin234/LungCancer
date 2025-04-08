from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.auth import get_password_hash
from app.models.user import User
from app.models.patient import Patient
from app.models.repair_rule import RepairRule
from app.models.base import Base
import os

def migrate_database():
    # 获取项目根目录
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # 创建数据库连接
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'lung_cancer.db')}"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    # 创建所有表
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 创建默认管理员用户
        default_admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        db.add(default_admin)
        db.commit()
        db.refresh(default_admin)

        # 将所有现有患者记录关联到默认管理员
        patients = db.query(Patient).filter(Patient.user_id.is_(None)).all()
        for patient in patients:
            patient.user_id = default_admin.id

        db.commit()
        print("Migration completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Migration failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_database()