<template>
  <div class="flex flex-col flex-1 overflow-hidden">
    <div class="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
      <div class="max-w-none sm:max-w-lg mx-auto space-y-5">

        <!-- Prompt Language -->
        <section class="space-y-3">
          <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Prompt Language
          </h3>
          <div class="flex gap-2">
            <Button
              v-for="[code, label] in languages"
              :key="code"
              size="sm"
              :variant="promptLang === code ? 'default' : 'outline'"
              class="text-xs h-8 flex-1"
              @click="handleSaveLanguage(code)"
            >
              {{ label }}
            </Button>
          </div>
          <p class="text-[11px] text-muted-foreground/60">Language used for system prompts and tool descriptions.</p>
        </section>

        <!-- Stream toggle -->
        <section class="space-y-3">
          <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Stream
          </h3>
          <div class="flex gap-2">
            <Button
              v-for="v in [true, false]"
              :key="String(v)"
              size="sm"
              :variant="stream === v ? 'default' : 'outline'"
              class="text-xs h-8 flex-1"
              @click="handleToggleStream(v)"
            >
              {{ v ? 'On' : 'Off' }}
            </Button>
          </div>
          <p class="text-[11px] text-muted-foreground/60">Enable streaming for real-time token output.</p>
        </section>

        <!-- Proxy -->
        <section class="space-y-3">
          <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Proxy
          </h3>
          <div class="flex gap-2">
            <Input v-model="proxy" placeholder="http://127.0.0.1:7890" />
            <Button
              variant="outline"
              size="sm"
              :disabled="savingProxy || !proxyDirty"
              @click="handleSaveProxy"
            >
              {{ savingProxy ? '...' : 'Save' }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="testingProxy || !proxySaved"
              @click="handleTestProxy"
            >
              {{ testingProxy ? '...' : 'Test' }}
            </Button>
          </div>
          <p
            v-if="proxyTestResult"
            :class="['text-[11px]', proxyTestResult === 'ok' ? 'text-emerald-500' : 'text-destructive']"
          >
            {{ proxyTestResult === 'ok' ? 'Proxy is reachable' : 'Proxy test failed' }}
          </p>
          <p class="text-[11px] text-muted-foreground/60">HTTP/SOCKS5 proxy for LLM API requests.</p>
        </section>

        <!-- Detected Providers -->
        <section>
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Detected Providers
            </h3>
            <Button variant="ghost" size="sm" :disabled="scanning" class="text-xs h-7" @click="scan">
              {{ scanning ? 'Scanning...' : 'Rescan' }}
            </Button>
          </div>
          <p v-if="providers.length === 0 && !scanning" class="text-xs text-muted-foreground/50 py-4 text-center">
            No providers detected
          </p>
          <div class="space-y-2">
            <Card
              v-for="p in providers"
              :key="p.name"
              :class="['px-4 py-3 cursor-pointer transition-colors', apiBase === p.api_base ? 'ring-1 ring-primary/40' : '']"
              @click="handleUseProvider(p)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span :class="['w-1.5 h-1.5 rounded-full', (p.models || []).length > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30']" />
                  <span class="text-sm font-medium">{{ p.name }}</span>
                  <span class="text-xs text-muted-foreground font-mono">{{ p.api_base }}</span>
                </div>
                <Button
                  size="sm"
                  :variant="apiBase === p.api_base ? 'default' : 'outline'"
                  class="text-xs h-7"
                  @click.stop="handleUseProvider(p)"
                >
                  Use →
                </Button>
              </div>
              <div v-if="(p.models || []).length > 0" class="flex flex-wrap gap-1 mt-2">
                <Badge v-for="m in p.models.slice(0, 6)" :key="m" variant="secondary" class="text-[11px] font-mono">
                  {{ m }}
                </Badge>
                <Badge v-if="p.models.length > 6" variant="secondary" class="text-[11px]">
                  +{{ p.models.length - 6 }}
                </Badge>
              </div>
            </Card>
          </div>
        </section>

        <!-- Manual Config -->
        <section class="space-y-3">
          <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Manual Configuration
          </h3>
          <div>
            <label class="text-xs text-muted-foreground mb-1 flex items-center gap-1">API Base</label>
            <Input v-model="apiBase" placeholder="http://localhost:11434/v1" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground mb-1 flex items-center gap-1">API Key</label>
            <Input type="password" v-model="apiKey" placeholder="sk-..." />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-muted-foreground flex items-center gap-1">Model</label>
              <Button variant="outline" size="sm" class="text-xs h-7" :disabled="!apiBase || loadingModels" @click="handleFetchModels">
                {{ loadingModels ? 'Loading...' : 'Fetch Models' }}
              </Button>
            </div>
            <p
              v-if="fetchStatus"
              :class="['text-[11px] mb-1.5', models.length > 0 ? 'text-emerald-500' : 'text-muted-foreground']"
            >
              {{ fetchStatus }}
            </p>
            <div v-if="models.length > 0" class="flex flex-wrap gap-1.5 mb-2">
              <Badge
                v-for="m in models"
                :key="m"
                :variant="m === model ? 'default' : 'outline'"
                class="text-[11px] font-mono cursor-pointer"
                @click="model = m"
              >
                {{ m }}
              </Badge>
            </div>
            <Input v-model="model" placeholder="qwen2.5:7b / gpt-4o / ..." />
          </div>
        </section>

        <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
        <Button class="w-full" :disabled="saving || !apiBase || !model" @click="handleSaveLLM">
          {{ saving ? 'Saving...' : 'Save LLM Config' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Input from '../ui/Input.vue';
import Badge from '../ui/Badge.vue';

export interface LLMProvider {
  name: string;
  api_base: string;
  models: string[];
}

export interface SettingsClient {
  getLLMConfig(): Promise<{ api_base: string; api_key: string; model: string; stream?: boolean; language?: string }>;
  getProxyConfig(): Promise<{ proxy: string }>;
  updateLLMConfig(params: { api_base: string; api_key?: string; model?: string }): Promise<{ message: string }>;
  updateStream(stream: boolean): Promise<{ message: string }>;
  updateLanguage(language: string): Promise<{ message: string }>;
  updateProxyConfig(proxy: string): Promise<{ message: string }>;
  testProxy(proxy: string): Promise<unknown>;
  probeLLMProviders(): Promise<LLMProvider[]>;
  fetchModels(params: { api_base: string; api_key?: string }): Promise<string[]>;
}

const props = defineProps<{
  client: SettingsClient;
  onSaved?: () => void;
}>();

const languages: [string, string][] = [['zh', '中文'], ['en', 'English'], ['ja', '日本語']];

const providers = ref<LLMProvider[]>([]);
const scanning = ref(false);
const apiBase = ref('');
const apiKey = ref('');
const model = ref('');
const models = ref<string[]>([]);
const proxy = ref('');
const proxySaved = ref('');
const savingProxy = ref(false);
const testingProxy = ref(false);
const proxyTestResult = ref<'ok' | 'fail' | ''>('');
const promptLang = ref('en');
const stream = ref(true);
const saving = ref(false);
const error = ref('');
const loadingModels = ref(false);
const fetchStatus = ref('');

const proxyDirty = computed(() => proxy.value !== proxySaved.value);

async function scan() {
  scanning.value = true;
  try {
    const result = await props.client.probeLLMProviders();
    providers.value = result || [];
  } catch {
    providers.value = [];
  }
  scanning.value = false;
}

async function handleSaveLanguage(lang: string) {
  promptLang.value = lang;
  await props.client.updateLanguage(lang);
  props.onSaved?.();
}

async function handleToggleStream(v: boolean) {
  stream.value = v;
  await props.client.updateStream(v);
  props.onSaved?.();
}

async function handleSaveProxy() {
  savingProxy.value = true;
  error.value = '';
  try {
    await props.client.updateProxyConfig(proxy.value);
    proxySaved.value = proxy.value;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'unknown error';
  }
  savingProxy.value = false;
}

async function handleTestProxy() {
  testingProxy.value = true;
  proxyTestResult.value = '';
  try {
    await props.client.testProxy(proxy.value);
    proxyTestResult.value = 'ok';
  } catch {
    proxyTestResult.value = 'fail';
  }
  testingProxy.value = false;
}

function handleUseProvider(p: LLMProvider) {
  apiBase.value = p.api_base;
  apiKey.value = '';
  model.value = '';
  fetchStatus.value = '';
  const m = p.models || [];
  models.value = m;
  if (m.length > 0) model.value = m[0];
  error.value = '';
}

async function handleFetchModels() {
  if (!apiBase.value) return;
  loadingModels.value = true;
  fetchStatus.value = '';
  error.value = '';
  try {
    const result = await props.client.fetchModels({ api_base: apiBase.value, api_key: apiKey.value });
    const list = result || [];
    models.value = list;
    if (list.length > 0) {
      model.value = list[0];
      fetchStatus.value = `Found ${list.length} model(s)`;
    } else {
      fetchStatus.value = 'No models found';
    }
  } catch {
    models.value = [];
    fetchStatus.value = 'Failed to fetch models';
  }
  loadingModels.value = false;
}

async function handleSaveLLM() {
  if (!apiBase.value || !model.value) {
    error.value = 'API Base and Model are required';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await props.client.updateLLMConfig({ api_base: apiBase.value, api_key: apiKey.value, model: model.value });
    props.onSaved?.();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'unknown error';
  }
  saving.value = false;
}

onMounted(() => {
  scan();
  Promise.all([props.client.getLLMConfig(), props.client.getProxyConfig()]).then(([llm, proxyConf]) => {
    apiBase.value = llm.api_base || '';
    apiKey.value = llm.api_key || '';
    model.value = llm.model || '';
    promptLang.value = llm.language || 'en';
    stream.value = llm.stream !== false;
    const p = proxyConf.proxy || '';
    proxy.value = p;
    proxySaved.value = p;
  });
});
</script>
