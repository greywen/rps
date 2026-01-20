'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AIOpponent {
  id: number;
  name: string;
  display_name: string;
  display_name_en: string | null;
  avatar: string | null;
  difficulty: string;
  description: string | null;
  description_en: string | null;
  provider: string | null;
  host: string | null;
  api_key: string | null;
  model: string | null;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface EditingOpponent {
  id?: number;
  name: string;
  display_name: string;
  display_name_en: string;
  avatar: string;
  difficulty: string;
  description: string;
  description_en: string;
  provider: string;
  host: string;
  api_key: string;
  model: string;
  enabled: boolean;
  sort_order: number;
}

const emptyOpponent: EditingOpponent = {
  name: '',
  display_name: '',
  display_name_en: '',
  avatar: '',
  difficulty: 'normal',
  description: '',
  description_en: '',
  provider: 'openai',
  host: 'https://api.openai.com/v1',
  api_key: '',
  model: 'gpt-4o-mini',
  enabled: true,
  sort_order: 10,
};

interface TestResult {
  success: boolean;
  message: string;
  model?: string;
}

interface AvatarItem {
  name: string;
  path: string;
}

export default function AIConfigsPage() {
  const router = useRouter();
  const [opponents, setOpponents] = useState<AIOpponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingOpponent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/check');
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        fetchOpponents();
        fetchAvatars();
      } else {
        router.replace('/admin/login');
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      router.replace('/admin/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.replace('/admin/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const fetchAvatars = async () => {
    try {
      const res = await fetch('/api/avatars');
      const data = await res.json();
      if (data.success) {
        setAvatars(data.data);
      }
    } catch (error) {
      console.error('获取头像列表失败:', error);
    }
  };

  const fetchOpponents = async () => {
    try {
      const res = await fetch('/api/ai-configs/admin');
      const data = await res.json();
      if (data.success) {
        setOpponents(data.data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      showMessage('error', '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (opponent: AIOpponent) => {
    setEditing({
      id: opponent.id,
      name: opponent.name,
      display_name: opponent.display_name,
      display_name_en: opponent.display_name_en || '',
      avatar: opponent.avatar || '',
      difficulty: opponent.difficulty,
      description: opponent.description || '',
      description_en: opponent.description_en || '',
      provider: opponent.provider || 'openai',
      host: opponent.host || 'https://api.openai.com/v1',
      api_key: opponent.api_key || '',
      model: opponent.model || '',
      enabled: opponent.enabled === 1,
      sort_order: opponent.sort_order ?? 10,
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setEditing({ ...emptyOpponent });
    setIsNew(true);
  };

  const handleClone = (opponent: AIOpponent) => {
    setEditing({
      name: '',
      display_name: opponent.display_name + ' (副本)',
      display_name_en: opponent.display_name_en ? opponent.display_name_en + ' (Copy)' : '',
      avatar: opponent.avatar || '',
      difficulty: opponent.difficulty,
      description: opponent.description || '',
      description_en: opponent.description_en || '',
      provider: opponent.provider || 'openai',
      host: opponent.host || 'https://api.openai.com/v1',
      api_key: opponent.api_key || '',
      model: opponent.model || '',
      enabled: false,
      sort_order: opponent.sort_order ?? 10,
    });
    setIsNew(true);
  };

  const handleCancel = () => {
    setEditing(null);
    setIsNew(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!editing) return;
    if (!editing.host || !editing.api_key || !editing.model) {
      setTestResult({ success: false, message: '请先填写 API Host、API Key 和模型名称' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai-configs/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          provider: editing.provider,
          host: editing.host,
          api_key: editing.api_key,
          model: editing.model,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: '连接成功！', model: data.model });
      } else {
        setTestResult({ success: false, message: data.error || '连接失败' });
      }
    } catch (error) {
      setTestResult({ success: false, message: '网络错误，无法测试连接' });
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateInfo = async () => {
    if (!editing) return;
    if (!editing.host || !editing.api_key || !editing.model) {
      setTestResult({ success: false, message: '请先填写 API Host、API Key 和模型名称' });
      return;
    }

    setGenerating(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai-configs/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          provider: editing.provider,
          host: editing.host,
          api_key: editing.api_key,
          model: editing.model,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditing({
          ...editing,
          display_name: data.display_name || editing.display_name,
          display_name_en: data.display_name_en || editing.display_name_en,
          description: data.description || editing.description,
          description_en: data.description_en || editing.description_en,
        });
        setTestResult({ success: true, message: '生成成功！已自动填充名称和描述（中/英文）' });
      } else {
        setTestResult({ success: false, message: data.error || '生成失败' });
      }
    } catch (error) {
      setTestResult({ success: false, message: '网络错误，无法生成' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!editing.name || !editing.display_name) {
      showMessage('error', '请填写标识名称和显示名称');
      return;
    }

    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch('/api/ai-configs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });

      const data = await res.json();
      if (data.success) {
        showMessage('success', isNew ? '创建成功' : '更新成功');
        setEditing(null);
        setIsNew(false);
        fetchOpponents();
      } else {
        showMessage('error', data.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个 AI 对手吗？')) return;

    try {
      const res = await fetch(`/api/ai-configs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '删除成功');
        fetchOpponents();
      } else {
        showMessage('error', data.error || '删除失败');
      }
    } catch (error) {
      showMessage('error', '删除失败');
    }
  };

  const handleToggleEnabled = async (opponent: AIOpponent) => {
    try {
      const res = await fetch('/api/ai-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opponent.id, enabled: opponent.enabled === 1 ? false : true }),
      });

      const data = await res.json();
      if (data.success) {
        fetchOpponents();
      } else {
        showMessage('error', data.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', '操作失败');
    }
  };

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-800 text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white font-medium`}>
          {message.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI 对手配置</h1>
            <p className="text-gray-500 text-sm">管理石头剪刀布游戏的 AI 对手</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors"
            >
              返回首页
            </button>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors"
            >
              添加对手
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-600 rounded-md transition-colors"
            >
              登出
            </button>
          </div>
        </div>

        {/* 编辑表单 */}
        {editing && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isNew ? '添加新对手' : '编辑对手'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">标识名称 *</label>
                <div className="flex items-center gap-3">
                  <select
                    value={editing.name}
                    onChange={(e) => {
                      const selectedAvatar = avatars.find(a => a.name === e.target.value);
                      setEditing({ 
                        ...editing, 
                        name: e.target.value,
                        avatar: selectedAvatar ? selectedAvatar.path : editing.avatar
                      });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  >
                    <option value="">请选择</option>
                    {avatars.map((avatar) => (
                      <option key={avatar.name} value={avatar.name}>
                        {avatar.name}
                      </option>
                    ))}
                  </select>
                  {editing.name && avatars.find(a => a.name === editing.name) && (
                    <img 
                      src={avatars.find(a => a.name === editing.name)?.path} 
                      alt={editing.name}
                      className="w-8 h-8"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">显示名称 *</label>
                <input
                  type="text"
                  value={editing.display_name}
                  onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                  placeholder="如: 小智"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">English Name</label>
                <input
                  type="text"
                  value={editing.display_name_en}
                  onChange={(e) => setEditing({ ...editing, display_name_en: e.target.value })}
                  placeholder="e.g. Smart AI"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">难度</label>
                <select
                  value={editing.difficulty}
                  onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="normal">普通</option>
                  <option value="chaos">混沌</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">排序优先级</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">值越大越排在前面</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">描述</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="如: 快速且经济实惠的 AI 对手"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">English Description</label>
                <input
                  type="text"
                  value={editing.description_en}
                  onChange={(e) => setEditing({ ...editing, description_en: e.target.value })}
                  placeholder="e.g. A fast and affordable AI opponent"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">API 提供商</label>
                <select
                  value={editing.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    setEditing({ 
                      ...editing, 
                      provider,
                      host: provider === 'azure' ? '' : 'https://api.openai.com/v1',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="openai">OpenAI / 兼容 API</option>
                  <option value="azure">Azure OpenAI</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  {editing.provider === 'azure' ? 'Azure Endpoint' : 'API Host'}
                </label>
                <input
                  type="text"
                  value={editing.host}
                  onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                  placeholder={editing.provider === 'azure' ? 'https://your-resource.openai.azure.com/' : 'https://api.openai.com/v1'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  {editing.provider === 'azure' ? '部署名称' : '模型名称'}
                </label>
                <input
                  type="text"
                  value={editing.model}
                  onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                  placeholder={editing.provider === 'azure' ? '如: gpt-4o-deployment' : '如: gpt-4o-mini'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={editing.api_key}
                  onChange={(e) => setEditing({ ...editing, api_key: e.target.value })}
                  placeholder="sk-... (留空则使用本地随机逻辑)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              {/* 测试连接与生成信息 */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || generating}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors text-sm disabled:opacity-50"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInfo}
                    disabled={testing || generating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm disabled:opacity-50"
                  >
                    {generating ? '生成中...' : '✨ AI 生成名称和描述'}
                  </button>
                </div>
                {testResult && (
                  <p className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.enabled}
                    onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  />
                  <span className="text-gray-700 text-sm">启用此对手</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 配置列表 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 对手列表</h2>
          
          {opponents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无对手，点击上方按钮添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opponents.map((opponent) => (
                <div
                  key={opponent.id}
                  className={`p-4 rounded-md border ${
                    opponent.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl flex items-center justify-center w-6 h-6">
                          {opponent.avatar?.startsWith('/') ? (
                            <img src={opponent.avatar} alt={opponent.display_name} className="w-6 h-6" />
                          ) : (
                            opponent.avatar || '🤖'
                          )}
                        </span>
                        <h3 className="font-medium text-gray-900">{opponent.display_name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          opponent.difficulty === 'normal' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {opponent.difficulty === 'normal' ? '普通' : '混沌'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          opponent.enabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {opponent.enabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{opponent.description || '无描述'}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">标识:</span>
                          <span className="text-gray-600 font-mono">{opponent.name}</span>
                        </div>
                        {opponent.model && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">模型:</span>
                            <span className="text-gray-600 font-mono">{opponent.model}</span>
                          </div>
                        )}
                        {opponent.host && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Host:</span>
                            <span className="text-gray-600 font-mono text-xs">{opponent.host}</span>
                          </div>
                        )}
                        {opponent.api_key && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Key:</span>
                            <span className="text-gray-600 font-mono">
                              {opponent.api_key.substring(0, 8)}...{opponent.api_key.slice(-4)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleEnabled(opponent)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors border ${
                          opponent.enabled
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {opponent.enabled ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleClone(opponent)}
                        className="px-3 py-1.5 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded text-sm transition-colors"
                      >
                        克隆
                      </button>
                      <button
                        onClick={() => handleEdit(opponent)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-sm transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(opponent.id)}
                        className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-6 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">使用说明</h2>
          <ul className="space-y-1 text-gray-600 text-sm">
            <li>• <strong>标识名称</strong>: 选择 AI 头像，对应 public/avatars 目录下的图标</li>
            <li>• <strong>显示名称</strong>: 在游戏界面显示的名称</li>
            <li>• <strong>性格描述</strong>: AI 的说话风格，会影响评语生成</li>
            <li>• <strong>难度</strong>: 影响 AI 的决策策略（本地模式）</li>
            <li>• <strong>API 配置</strong>: 如果填写了 API Key，将调用 AI 模型生成选择；否则使用本地随机逻辑</li>
            <li>• 配置保存后会实时生效，无需重启服务</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
