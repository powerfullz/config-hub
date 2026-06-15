export interface Profile {
  id: number;
  user_id: number;
  name: string;
  group_type: number;     // 0=select, 1=url-test, 2=load-balance
  landing: boolean;
  ipv6: boolean;
  tun: boolean;
  full: boolean;
  keep_alive: boolean;
  fake_ip: boolean;
  quic: boolean;
  regex: boolean;
  threshold: number;
  file_name: string;
  proxy_groups?: ProxyGroup[];
  rules?: RuleEntry[];
  subscriptions?: Subscription[];
  subscription_groups?: SubscriptionGroup[];
}

export interface ProxyGroup {
  id: number;
  profile_id: number;
  name: string;
  type: string; // select | url-test | load-balance | fallback
  icon: string;
  sort_order: number;
  proxies: string; // JSON string array
  include_all: boolean;
  filter: string;
  url: string;
  interval: number;
}

export interface RuleEntry {
  id: number;
  profile_id: number;
  rule_text: string;
  sort_order: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  name: string;
  url: string;
  user_agent: string;
  fetch_proxy: string;
  cron_expr: string;
  interval_secs: number;
  node_count: number;
  traffic_info: string;
  enabled: boolean;
  last_fetched_at?: string;
}

export interface Node {
  id: number;
  subscription_id: number;
  name: string;
  type: string;
  server: string;
  port: number;
  protocol: string;
  country: string;
  latency: number;
  updated_at: string;
}

export interface Token {
  id: number;
  profile_id: number;
  name: string;
  last_used_at?: string;
  revoked: boolean;
  created_at: string;
}

export interface TokenCreateResponse {
  id: number;
  token: string;
  name: string;
  created_at: string;
  message?: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface SubscriptionGroup {
  id: number;
  user_id: number;
  name: string;
  subscriptions?: Subscription[];
  created_at: string;
}
