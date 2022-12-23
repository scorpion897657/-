import { startsWith, get, some, mapValues } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Tooltip from "@/components/Tooltip";
import Drawer from "antd/lib/drawer";
import Link from "@/components/Link";
import PlainButton from "@/components/PlainButton";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import BigMessage from "@/components/BigMessage";
import DynamicComponent, { registerComponent } from "@/components/DynamicComponent";

import "./HelpTrigger.less";

const DOMAIN = "https://redash.io";
const HELP_PATH = "/help";
const IFRAME_TIMEOUT = 20000;
const IFRAME_URL_UPDATE_MESSAGE = "iframe_url";

export const TYPES = mapValues(
  {
    HOME: ["", "Help"],
    VALUE_SOURCE_OPTIONS: ["/user-guide/querying/query-parameters#Value-Source-Options", "指南: 數據源選項"],
    SHARE_DASHBOARD: ["/user-guide/dashboards/sharing-dashboards", "指南: 分享或嵌入儀表板"],
    AUTHENTICATION_OPTIONS: ["/user-guide/users/authentication-options", "指南: 身份驗證選項"],
    USAGE_DATA_SHARING: ["/open-source/admin-guide/usage-data", "幫助: 匿名使用數據分享"],
    DS_ATHENA: ["/data-sources/amazon-athena-setup", "指南: 設定Amazon Athena"],
    DS_BIGQUERY: ["/data-sources/bigquery-setup", "指南: 設定BigQuery"],
    DS_URL: ["/data-sources/querying-urls", "指南: 設定URL"],
    DS_MONGODB: ["/data-sources/mongodb-setup", "指南: 設定MongoDB"],
    DS_GOOGLE_SPREADSHEETS: [
      "/data-sources/querying-a-google-spreadsheet",
      "指南: 設定Google Spreadsheets",
    ],
    DS_GOOGLE_ANALYTICS: ["/data-sources/google-analytics-setup", "指南: 設定 Google Analytics"],
    DS_AXIBASETSD: ["/data-sources/axibase-time-series-database", "指南: 設定 Axibase 時間系列資料庫"],
    DS_RESULTS: ["/user-guide/querying/query-results-data-source", "指南: 設定查詢"],
    ALERT_SETUP: ["/user-guide/alerts/setting-up-an-alert", "指南: 設置新提醒"],
    MAIL_CONFIG: ["/open-source/setup/#Mail-Configuration", "指南: 配置信箱服務"],
    ALERT_NOTIF_TEMPLATE_GUIDE: ["/user-guide/alerts/custom-alert-notifications", "指南: 自定義提醒通知"],
    FAVORITES: ["/user-guide/querying/favorites-tagging/#Favorites", "指南: 收藏"],
    MANAGE_PERMISSIONS: [
      "/user-guide/querying/writing-queries#Managing-Query-Permissions",
      "指南: 設置查詢權限",
    ],
    NUMBER_FORMAT_SPECS: ["/user-guide/visualizations/formatting-numbers", "格式化數字"],
    GETTING_STARTED: ["/user-guide/getting-started", "指南: 開始"],
    DASHBOARDS: ["/user-guide/dashboards", "指南: 儀表板"],
    QUERIES: ["/user-guide/querying", "指南: 查詢"],
    ALERTS: ["/user-guide/alerts", "指南: 提醒"],
  },
  ([url, title]) => [DOMAIN + HELP_PATH + url, title]
);

const HelpTriggerPropTypes = {
  type: PropTypes.string,
  href: PropTypes.string,
  title: PropTypes.node,
  className: PropTypes.string,
  showTooltip: PropTypes.bool,
  renderAsLink: PropTypes.bool,
  children: PropTypes.node,
};

const HelpTriggerDefaultProps = {
  type: null,
  href: null,
  title: null,
  className: null,
  showTooltip: true,
  renderAsLink: false,
  children: <i className="fa fa-question-circle" aria-hidden="true" />,
};

export function helpTriggerWithTypes(types, allowedDomains = [], drawerClassName = null) {
  return class HelpTrigger extends React.Component {
    static propTypes = {
      ...HelpTriggerPropTypes,
      type: PropTypes.oneOf(Object.keys(types)),
    };

    static defaultProps = HelpTriggerDefaultProps;

    iframeRef = React.createRef();

    iframeLoadingTimeout = null;

    state = {
      visible: false,
      loading: false,
      error: false,
      currentUrl: null,
    };

    componentDidMount() {
      window.addEventListener("message", this.onPostMessageReceived, false);
    }

    componentWillUnmount() {
      window.removeEventListener("message", this.onPostMessageReceived);
      clearTimeout(this.iframeLoadingTimeout);
    }

    loadIframe = url => {
      clearTimeout(this.iframeLoadingTimeout);
      this.setState({ loading: true, error: false });

      this.iframeRef.current.src = url;
      this.iframeLoadingTimeout = setTimeout(() => {
        this.setState({ error: url, loading: false });
      }, IFRAME_TIMEOUT); // safety
    };

    onIframeLoaded = () => {
      this.setState({ loading: false });
      clearTimeout(this.iframeLoadingTimeout);
    };

    onPostMessageReceived = event => {
      if (!some(allowedDomains, domain => startsWith(event.origin, domain))) {
        return;
      }

      const { type, message: currentUrl } = event.data || {};
      if (type !== IFRAME_URL_UPDATE_MESSAGE) {
        return;
      }

      this.setState({ currentUrl });
    };

    getUrl = () => {
      const helpTriggerType = get(types, this.props.type);
      return helpTriggerType ? helpTriggerType[0] : this.props.href;
    };

    openDrawer = e => {
      // keep "open in new tab" behavior
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.setState({ visible: true });
        // wait for drawer animation to complete so there's no animation jank
        setTimeout(() => this.loadIframe(this.getUrl()), 300);
      }
    };

    closeDrawer = event => {
      if (event) {
        event.preventDefault();
      }
      this.setState({ visible: false });
      this.setState({ visible: false, currentUrl: null });
    };

    render() {
      const targetUrl = this.getUrl();
      if (!targetUrl) {
        return null;
      }

      const tooltip = get(types, `${this.props.type}[1]`, this.props.title);
      const className = cx("help-trigger", this.props.className);
      const url = this.state.currentUrl;
      const isAllowedDomain = some(allowedDomains, domain => startsWith(url || targetUrl, domain));
      const shouldRenderAsLink = this.props.renderAsLink || !isAllowedDomain;

      return (
        <React.Fragment>
          <Tooltip
            title={
              this.props.showTooltip ? (
                <>
                  {tooltip}
                  {shouldRenderAsLink && (
                    <>
                      {" "}
                      <i className="fa fa-external-link" style={{ marginLeft: 5 }} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </>
                  )}
                </>
              ) : null
            }>
            <Link
              href={url || this.getUrl()}
              className={className}
              rel="noopener noreferrer"
              target="_blank"
              onClick={shouldRenderAsLink ? () => {} : this.openDrawer}>
              {this.props.children}
            </Link>
          </Tooltip>
          <Drawer
            placement="right"
            closable={false}
            onClose={this.closeDrawer}
            visible={this.state.visible}
            className={cx("help-drawer", drawerClassName)}
            destroyOnClose
            width={400}>
            <div className="drawer-wrapper">
              <div className="drawer-menu">
                {url && (
                  <Tooltip title="Open page in a new window" placement="left">
                    {/* eslint-disable-next-line react/jsx-no-target-blank */}
                    <Link href={url} target="_blank">
                      <i className="fa fa-external-link" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </Link>
                  </Tooltip>
                )}
                <Tooltip title="Close" placement="bottom">
                  <PlainButton onClick={this.closeDrawer}>
                    <CloseOutlinedIcon />
                  </PlainButton>
                </Tooltip>
              </div>

              {/* iframe */}
              {!this.state.error && (
                <iframe
                  ref={this.iframeRef}
                  title="Usage Help"
                  src="about:blank"
                  className={cx({ ready: !this.state.loading })}
                  onLoad={this.onIframeLoaded}
                />
              )}

              {/* loading indicator */}
              {this.state.loading && (
                <BigMessage icon="fa-spinner fa-2x fa-pulse" message="Loading..." className="help-message" />
              )}

              {/* error message */}
              {this.state.error && (
                <BigMessage icon="fa-exclamation-circle" className="help-message">
                  Something went wrong.
                  <br />
                  {/* eslint-disable-next-line react/jsx-no-target-blank */}
                  <Link href={this.state.error} target="_blank" rel="noopener">
                    Click here
                  </Link>{" "}
                  to open the page in a new window.
                </BigMessage>
              )}
            </div>

            {/* extra content */}
            <DynamicComponent name="HelpDrawerExtraContent" onLeave={this.closeDrawer} openPageUrl={this.loadIframe} />
          </Drawer>
        </React.Fragment>
      );
    }
  };
}

registerComponent("HelpTrigger", helpTriggerWithTypes(TYPES, [DOMAIN]));

export default function HelpTrigger(props) {
  return <DynamicComponent {...props} name="HelpTrigger" />;
}

HelpTrigger.propTypes = HelpTriggerPropTypes;
HelpTrigger.defaultProps = HelpTriggerDefaultProps;
