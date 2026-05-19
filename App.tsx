import React, { useEffect, useState } from 'react';
import { Button, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  content: string;
  deadline: string;
  memo: string;
  repeatId?: string;
  completedAt?: string;
}

interface RepeatPattern {
  id: string;
  title: string;
  description: string;
  content: string;
  time: string;
  intervalDays: number;
  endDate: string;
}

interface HistorySnapshot {
  todos: TodoItem[];
  completedTodos: TodoItem[];
  repeatPatterns: RepeatPattern[];
}

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [repeatPatterns, setRepeatPatterns] = useState<RepeatPattern[]>([]);
  const [completedTodos, setCompletedTodos] = useState<TodoItem[]>([]);
  
  // ★ 履歴管理用スタック（過去と未来）
  const [pastHistory, setPastHistory] = useState<HistorySnapshot[]>([]);
  const [futureHistory, setFutureHistory] = useState<HistorySnapshot[]>([]); // ★新しく追加

  // 入力フォーム用State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('12:00');
  const [memo, setMemo] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('');
  const [repeatEndDate, setRepeatEndDate] = useState('');

  // 詳細モーダル用State
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // データの読み込みと保存
  useEffect(() => {
    const savedTodos = localStorage.getItem('advanced-todo-list-v6');
    const savedPatterns = localStorage.getItem('repeat-patterns-v6');
    const savedCompleted = localStorage.getItem('completed-todos-v6');
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedPatterns) setRepeatPatterns(JSON.parse(savedPatterns));
    if (savedCompleted) setCompletedTodos(JSON.parse(savedCompleted));
  }, []);

  useEffect(() => {
    localStorage.setItem('advanced-todo-list-v6', JSON.stringify(todos));
    localStorage.setItem('repeat-patterns-v6', JSON.stringify(repeatPatterns));
    localStorage.setItem('completed-todos-v6', JSON.stringify(completedTodos));
  }, [todos, repeatPatterns, completedTodos]);

  // ★変更：現在の状態を履歴に保存する（新規操作時は未来の履歴をクリアする）
  const saveToHistory = () => {
    const snapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, snapshot]);
    setFutureHistory([]); // ★普通の操作を挟んだら、Redoできる未来の履歴はリセットする
  };

  // ★変更：【Undo (元に戻す)】
  const handleUndo = () => {
    if (pastHistory.length === 0) return;

    // 現在の状態を「未来の履歴（Redo用）」に1つ退避させる
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setFutureHistory([currentSnapshot, ...futureHistory]);

    // 過去の履歴から1つ取り出す
    const previous = pastHistory[pastHistory.length - 1];
    const newPast = pastHistory.slice(0, pastHistory.length - 1);

    setTodos(previous.todos);
    setCompletedTodos(previous.completedTodos);
    setRepeatPatterns(previous.repeatPatterns);
    setPastHistory(newPast);
  };

  // ★新しく追加：【Redo (やり直す) 機能】の本体
  const handleRedo = () => {
    if (futureHistory.length === 0) return; // 未来がなければ何もしない

    // 未来の履歴の「先頭（一番近い未来）」を取り出す
    const nextItem = futureHistory[0];
    const newFuture = futureHistory.slice(1);

    // 移動する前に、現在の状態を「過去の履歴（Undo用）」に保存する
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, currentSnapshot]);

    // 画面の状態を未来に進める
    setTodos(nextItem.todos);
    setCompletedTodos(nextItem.completedTodos);
    setRepeatPatterns(nextItem.repeatPatterns);
    setFutureHistory(newFuture);
  };

  const addTodo = () => {
    if (title.trim() === '' || deadlineDate === '') {
      alert('タイトルと締め切り日は必須入力です！');
      return;
    }

    saveToHistory(); // 履歴に保存

    const intervalDays = parseInt(repeatInterval, 10);
    const fullDeadline = `${deadlineDate}T${deadlineTime}`;

    if (!isNaN(intervalDays) && intervalDays > 0) {
      if (!repeatEndDate) {
        alert('繰り返しを設定する場合は、終了日も指定してください！');
        return;
      }
      const newPatternId = `pattern-${Date.now()}`;
      const newPattern: RepeatPattern = { id: newPatternId, title, description, content, time: deadlineTime, intervalDays, endDate: repeatEndDate };
      setRepeatPatterns([...repeatPatterns, newPattern]);

      const firstTodo: TodoItem = { id: `todo-${Date.now()}`, title, description, content, deadline: fullDeadline, memo, repeatId: newPatternId };
      setTodos([...todos, firstTodo]);
    } else {
      const singleTodo: TodoItem = { id: `todo-${Date.now()}`, title, description, content, deadline: fullDeadline, memo };
      setTodos([...todos, singleTodo]);
    }

    setTitle(''); setDescription(''); setContent(''); setMemo(''); setRepeatInterval(''); setRepeatEndDate('');
  };

  const completeTodo = (targetTodo: TodoItem) => {
    saveToHistory(); // 履歴に保存

    const todayStr = new Date().toISOString().split('T')[0];
    const completedItem: TodoItem = { ...targetTodo, completedAt: todayStr };

    let updatedCompleted = [completedItem, ...completedTodos];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    updatedCompleted = updatedCompleted.filter((todo) => {
      if (!todo.completedAt) return false;
      return new Date(todo.completedAt) >= thirtyDaysAgo;
    });

    if (updatedCompleted.length > 100) {
      updatedCompleted = updatedCompleted.slice(0, 100);
    }
    setCompletedTodos(updatedCompleted);

    const filteredTodos = todos.filter((todo) => todo.id !== targetTodo.id);

    if (targetTodo.repeatId) {
      const pattern = repeatPatterns.find((p) => p.id === targetTodo.repeatId);
      if (pattern) {
        const currentDeadline = new Date(targetTodo.deadline);
        currentDeadline.setDate(currentDeadline.getDate() + pattern.intervalDays);
        const endDate = new Date(pattern.endDate);

        if (currentDeadline <= endDate) {
          const y = currentDeadline.getFullYear();
          const m = String(currentDeadline.getMonth() + 1).padStart(2, '0');
          const d = String(currentDeadline.getDate()).padStart(2, '0');
          const nextTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            title: pattern.title,
            description: pattern.description,
            content: pattern.content,
            deadline: `${y}-${m}-${d}T${pattern.time}`,
            memo: '',
            repeatId: pattern.id,
          };
          setTodos([...filteredTodos, nextTodo]);
          return;
        } else {
          setRepeatPatterns(repeatPatterns.filter((p) => p.id !== pattern.id));
        }
      }
    }
    setTodos(filteredTodos);
  };

  const openDetailModal = (todo: TodoItem) => {
    setSelectedTodo(todo);
    setIsModalVisible(true);
  };

  const sortedTodos = [...todos].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const formatDeadline = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー部分：UndoとRedoの2つのボタンを並べる */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>多機能Todoリスト</Text>
        <View style={styles.historyButtonGroup}>
          <TouchableOpacity 
            style={[styles.historyButton, pastHistory.length === 0 && styles.buttonDisabled]} 
            onPress={handleUndo}
            disabled={pastHistory.length === 0}
          >
            <Text style={styles.buttonText}>↩️ Undo ({pastHistory.length})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.historyButton, { marginLeft: 6 }, futureHistory.length === 0 && styles.buttonDisabled]} 
            onPress={handleRedo}
            disabled={futureHistory.length === 0}
          >
            <Text style={styles.buttonText}>↪️ Redo ({futureHistory.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 入力フォーム */}
      <View style={styles.formContainer}>
        <ScrollView style={{ maxHeight: 130 }}>
          <TextInput style={styles.input} placeholder="タイトル（必須）" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="概要" value={description} onChangeText={setDescription} />
          <TextInput style={styles.input} placeholder="内容" value={content} onChangeText={setContent} />
          <TextInput style={styles.input} placeholder="その他メモ" value={memo} onChangeText={setMemo} />
          <View style={styles.dateTimeRow}>
            <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginRight: 5 }} />
            <input type="time" step="300" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...webInputStyle, width: '100px' }} />
          </View>
          <View style={styles.repeatSection}>
            <Text style={styles.sectionLabel}>🔄 定期タスク設定 (任意)</Text>
            <View style={styles.dateTimeRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 5, marginBottom: 0 }]} placeholder="例: 3" keyboardType="numeric" value={repeatInterval} onChangeText={setRepeatInterval} />
              <Text style={{ alignSelf: 'center', marginRight: 10, fontSize: 13 }}>日置き</Text>
              <input type="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginBottom: 0 }} />
              <Text style={{ alignSelf: 'center', marginLeft: 5, fontSize: 13 }}>まで</Text>
            </View>
          </View>
        </ScrollView>
        <Button title="タスクを追加" onPress={addTodo} />
      </View>

      {/* メインのタスク一覧 */}
      <Text style={styles.listHeader}>項目一覧（締め切り順）</Text>
      <FlatList
        data={sortedTodos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity style={styles.checkbox} onPress={() => completeTodo(item)}>
              <View style={styles.checkboxInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.textContainer} onPress={() => openDetailModal(item)}>
              <Text style={styles.todoTitle}>{item.title} {item.repeatId ? <Text style={styles.repeatBadge}>🔄 定期</Text> : null}</Text>
              {item.description ? <Text style={styles.todoDescription}>{item.description}</Text> : null}
              <Text style={styles.deadlineText}>🚨 締め切り: {formatDeadline(item.deadline)}</Text>
            </TouchableOpacity>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* 終了タスク表示エリア */}
      <View style={styles.completedSection}>
        <Text style={styles.completedHeader}>✅ 終了したタスク (最新100件/30日以内)</Text>
        <FlatList
          data={completedTodos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.completedItem} onPress={() => openDetailModal(item)}>
              <Text style={styles.completedTitle}>✓ {item.title}</Text>
              <Text style={styles.completedDate}>完了日: {item.completedAt}</Text>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 90 }}
        />
      </View>

      {/* 詳細確認用モーダル */}
      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTodo && (
              <ScrollView>
                <Text style={styles.modalTitle}>📋 タスク詳細</Text>
                <Text style={styles.modalLabel}>【タイトル】</Text><Text style={styles.modalValue}>{selectedTodo.title}</Text>
                <Text style={styles.modalLabel}>【概要】</Text><Text style={styles.modalValue}>{selectedTodo.description || '（なし）'}</Text>
                <Text style={styles.modalLabel}>【内容】</Text><Text style={styles.modalValue}>{selectedTodo.content || '（なし）'}</Text>
                <Text style={styles.modalLabel}>【締め切り日時】</Text><Text style={styles.modalValue}>{formatDeadline(selectedTodo.deadline)}</Text>
                <Text style={styles.modalLabel}>【その他メモ】</Text><Text style={styles.modalValue}>{selectedTodo.memo || '（なし）'}</Text>
                {selectedTodo.completedAt && (<><Text style={styles.modalLabel}>【完了日】</Text><Text style={styles.modalValue}>{selectedTodo.completedAt}</Text></>)}
              </ScrollView>
            )}
            <View style={{ marginTop: 15 }}><Button title="閉じる" color="#666" onPress={() => setIsModalVisible(false)} /></View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const webInputStyle = {
  height: '38px', padding: '0 10px', borderColor: '#ddd', borderWidth: '1px', borderRadius: '5px', marginBottom: '10px', fontSize: '14px', fontFamily: 'sans-serif', backgroundColor: '#fff',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  // ボタンを横並びにするグループ
  historyButtonGroup: { flexDirection: 'row' },
  historyButton: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 15 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  formContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, paddingHorizontal: 10, height: 36, marginBottom: 8, fontSize: 13 },
  dateTimeRow: { flexDirection: 'row', marginBottom: 5 },
  repeatSection: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 5, marginBottom: 5, borderWidth: 1, borderColor: '#e8e8e8' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  listHeader: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 8 },
  todoItem: { backgroundColor: '#fff', padding: 12, borderRadius: 5, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: '#FF9500', flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FF9500', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  textContainer: { flex: 1, cursor: 'pointer' },
  todoTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  repeatBadge: { fontSize: 10, color: '#007AFF', fontWeight: 'normal' },
  todoDescription: { fontSize: 12, color: '#666', marginTop: 2 },
  deadlineText: { fontSize: 11, color: '#FF3B30', fontWeight: '600', marginTop: 3 },
  
  completedSection: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10, marginTop: 10, backgroundColor: '#eaeaea', padding: 10, borderRadius: 8 },
  completedHeader: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  completedItem: { backgroundColor: '#fff', padding: 8, borderRadius: 4, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7, cursor: 'pointer' },
  completedTitle: { fontSize: 13, color: '#777' }, 
  completedDate: { fontSize: 11, color: '#999' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  modalLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10 },
  modalValue: { fontSize: 14, color: '#333', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 5, marginTop: 4 },
});