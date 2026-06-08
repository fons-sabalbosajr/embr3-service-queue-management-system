import bgemb from '../../assets/bgemb.webp';
import emblogo from '../../assets/emblogo.svg';
import bagongPilipinas from '../../assets/bagongpilipinaslogo.png';
import { BRAND, BRAND_SHORT } from '../../theme';
import './AuthLayout.css';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div
        className="auth-bg"
        style={{ backgroundImage: `url(${bgemb})` }}
        aria-hidden="true"
      />
      <div className="auth-overlay" aria-hidden="true" />
      <div className="auth-shapes" aria-hidden="true">
        <span className="auth-shape auth-shape-one" />
        <span className="auth-shape auth-shape-two" />
        <span className="auth-shape auth-shape-three" />
        <span className="auth-shape auth-shape-four" />
      </div>

      <main className="auth-center">
        <div className="auth-card">
          <div className="auth-logos">
            <img src={emblogo} alt="EMB" className="auth-logo-emb" />
            <div className="auth-logo-sep" />
            <img
              src={bagongPilipinas}
              alt="Bagong Pilipinas"
              className="auth-logo-bp"
            />
          </div>

          <p className="auth-brand-tag">{BRAND_SHORT}</p>
          <h2 className="auth-title">{title}</h2>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}

          {children}

          {footer ? <div className="auth-footer">{footer}</div> : null}
        </div>

        <p className="auth-page-footer">{BRAND}</p>
      </main>
    </div>
  );
}

