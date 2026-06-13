import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

export function HomePage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <main className="app-shell">
      <div className="siteintro-bg row">
        <div className="siteintro">
          <div className="siteintro-cover">
            <div className="siteintro-wrap">
              <h1 className="site-heading">21st Century Software Development Platform</h1>
              <ul className="site-features">
                <li>Just focus on what you have to do</li>
              </ul>
            </div>
            <div className="signup-btn">
              <a
                className="ybtn ybtn-success ybtn-padding"
                href={appHref(runtimeConfig, "/users/signupform")}
              >
                button.signup
              </a>
            </div>
          </div>
        </div>
        <div className="feature">
          <h2>
            <span>title.features</span>
          </h2>
          <ul className="feature-wrap row">
            <li>
              <div className="feature-image">
                <i className="yobicon-cgicenter"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.unlimitedProjects</h3>
                <p className="feature-desc">site.features.unlimitedProjects</p>
              </div>
            </li>
            <li>
              <div className="feature-image">
                <i className="yobicon-code"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.codeManagement</h3>
                <p className="feature-desc">site.features.codeManagement</p>
              </div>
            </li>
            <li>
              <div className="feature-image">
                <i className="yobicon-articles"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.issueTracker</h3>
                <p className="feature-desc">site.features.issueTracker</p>
              </div>
            </li>
            <li>
              <div className="feature-image">
                <i className="yobicon-lock"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.privateProject</h3>
                <p className="feature-desc">site.features.privateRepositories</p>
              </div>
            </li>
            <li>
              <div className="feature-image">
                <i className="yobicon-preview"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.codeReview</h3>
                <p className="feature-desc">site.features.codeReview</p>
              </div>
            </li>
            <li>
              <div className="feature-image">
                <i className="yobicon-friends"></i>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">title.workTeam</h3>
                <p className="feature-desc">site.features.workTeam</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
