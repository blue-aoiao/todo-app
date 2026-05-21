import React, { useEffect, useState } from 'react';
import { Button, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Tag {
  id: string;
  name: string;
  color: string; // 例: '#FF3B30' (HEX値)
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  content: string;
  deadline: string;
  memo: string;
  repeatId?: string;
  completedAt?: string;
  tags: string[];
}

interface RepeatPattern {
  id: string;
  title: string;
  description: string;
  content: string;
  time: string;
  intervalDays: number;
  startDate: string;
  endDate: string;
  tags: string[];
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
  
  const [pastHistory, setPastHistory] = useState<HistorySnapshot[]>([]);
  const [futureHistory, setFutureHistory] = useState<HistorySnapshot[]>([]);

  // メイン画面切り替え（0: タスク一覧, 1: カレンダー）
  const [currentTab, setCurrentTab] = useState(0);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // カレンダーの基準月
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // 特定の日付のタスクを確認するモーダル
  const [selectedDateTodos, setSelectedDateTodos] = useState<TodoItem[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  // 入力フォーム用State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('12:00');
  const [memo, setMemo] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('');
  const [repeatEndDate, setRepeatEndDate] = useState('');

  // タグのマスターデータ
  const [tags, setTags] = useState<Tag[]>([
    { id: 'tag-1', name: '仕事', color: '#007AFF' },
    { id: 'tag-2', name: 'プライベート', color: '#34C759' },
    { id: 'tag-3', name: '重要', color: '#FF3B30' },
  ]);

  // 現在フィルター（ソート）対象として選択されているタグのID（nullならすべて表示）
  const [selectedFilterTagId, setSelectedFilterTagId] = useState<string | null>(null);

  // 新規タスク作成時、現在フォームで選択されているタグIDの配列
  const [selectedFormTagIds, setSelectedFormTagIds] = useState<string[]>([]);

  // タグ管理モーダルの表示フラグ
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);

  // 詳細モーダル用State
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  useEffect(() => {
    const savedTodos = localStorage.getItem('advanced-todo-list-v10');
    const savedPatterns = localStorage.getItem('repeat-patterns-v10');
    const savedCompleted = localStorage.getItem('completed-todos-v10');
    const savedTags = localStorage.getItem('todo-tags-v10');
    
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedPatterns) setRepeatPatterns(JSON.parse(savedPatterns));
    if (savedCompleted) setCompletedTodos(JSON.parse(savedCompleted));
    if (savedTags) setTags(JSON.parse(savedTags));
  }, []);

  useEffect(() => {
    localStorage.setItem('advanced-todo-list-v10', JSON.stringify(todos));
    localStorage.setItem('repeat-patterns-v10', JSON.stringify(repeatPatterns));
    localStorage.setItem('completed-todos-v10', JSON.stringify(completedTodos));
    localStorage.setItem('todo-tags-v10', JSON.stringify(tags));
  }, [todos, repeatPatterns, completedTodos, tags]);

  const saveToHistory = () => {
    const snapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, snapshot]);
    setFutureHistory([]);
  };

  const handleUndo = () => {
    if (pastHistory.length === 0) return;
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setFutureHistory([currentSnapshot, ...futureHistory]);

    const previous = pastHistory[pastHistory.length - 1];
    const newPast = pastHistory.slice(0, pastHistory.length - 1);
    setTodos(previous.todos);
    setCompletedTodos(previous.completedTodos);
    setRepeatPatterns(previous.repeatPatterns);
    setPastHistory(newPast);
  };

  const handleRedo = () => {
    if (futureHistory.length === 0) return;
    const nextItem = futureHistory[0];
    const newFuture = futureHistory.slice(1);
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, currentSnapshot]);
    setTodos(nextItem.todos);
    setCompletedTodos(nextItem.completedTodos);
    setRepeatPatterns(nextItem.repeatPatterns);
    setFutureHistory(newFuture);
  };

  const addTodo = () => {
    if (title.trim() === '' || deadlineDate === '') {
      alert('タイトルと締め切り日は必須入力です。');
      return;
    }

    saveToHistory();

    const intervalDays = parseInt(repeatInterval, 10);
    const generatedTodos: TodoItem[] = [];

    if (!isNaN(intervalDays) && intervalDays > 0) {
      if (!repeatEndDate) {
        alert('繰り返しを設定する場合は、終了日も指定してください。');
        return;
      }
      const newPatternId = `pattern-${Date.now()}`;
      const newPattern: RepeatPattern = { 
        id: newPatternId, title, description, content, time: deadlineTime, intervalDays, startDate: deadlineDate, endDate: repeatEndDate, 
        tags: selectedFormTagIds
      };
      setRepeatPatterns([...repeatPatterns, newPattern]);

      // 定期タスクを終了日までループしてすべて一括生成
      const start = new Date(deadlineDate.replace(/-/g, '/'));
      const end = new Date(repeatEndDate.replace(/-/g, '/'));
      let current = new Date(start);
      let count = 0;

      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        
        generatedTodos.push({
          id: `todo-${Date.now()}-${count}`,
          title,
          description,
          content,
          deadline: `${y}-${m}-${d}T${deadlineTime}`,
          memo,
          repeatId: newPatternId,
          tags: selectedFormTagIds
        });

        current.setDate(current.getDate() + intervalDays);
        count++;
      }
      setTodos([...todos, ...generatedTodos]);
    } else {
      // 単発タスクの生成
      const fullDeadline = `${deadlineDate}T${deadlineTime}`;
      const singleTodo: TodoItem = {
        id: `todo-${Date.now()}`, title, description, content, deadline: fullDeadline, memo, tags: selectedFormTagIds 
      };
      setTodos([...todos, singleTodo]);
    }

    setTitle(''); setDescription(''); setContent(''); setMemo(''); setRepeatInterval(''); setRepeatEndDate('');
    setSelectedFormTagIds([]);
    setIsAddModalVisible(false);
  };

  const completeTodo = (targetTodo: TodoItem) => {
    saveToHistory();

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

    // 該当のタスクを一覧から除外
    setTodos(todos.filter((todo) => todo.id !== targetTodo.id));
  };

  const openDetailModal = (todo: TodoItem) => {
    setSelectedTodo(todo);
    setIsDetailModalVisible(true);
  };

  const formatDeadline = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // タスク一覧（リスト画面）用のフィルタリングロジック
  const getFilteredListTodos = () => {
    let sourceTodos = todos;
    if (selectedFilterTagId) {
      sourceTodos = todos.filter(todo => todo.tags && todo.tags.includes(selectedFilterTagId));
    }
    // 1. まず通常の単発タスクをすべて抽出
    const singleTodos = sourceTodos.filter(todo => !todo.repeatId);

    // 2. 定期タスクに関しては、グループ（repeatId）ごとに一番期限が近い1件だけを抽出
    const repeatMap = new Map<string, TodoItem>();
    sourceTodos.forEach(todo => {
      if (todo.repeatId) {
        const existing = repeatMap.get(todo.repeatId);
        if (!existing || new Date(todo.deadline).getTime() < new Date(existing.deadline).getTime()) {
          repeatMap.set(todo.repeatId, todo);
        }
      }
    });

    const nearestRepeatTodos = Array.from(repeatMap.values());
    
    // 3. これらを合体させて、全体の期限順に並び替える
    const combined = [...singleTodos, ...nearestRepeatTodos];
    return combined.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  };

  const listTodos = getFilteredListTodos();

  // カレンダー用のセル抽出
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const handleDatePress = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTodos = todos.filter(todo => todo.deadline.startsWith(dateStr));
    setSelectedDateStr(`${currentYear}年${currentMonth + 1}月${day}日`);
    setSelectedDateTodos(dayTodos);
    setIsDateModalVisible(true);
  };

  const renderCalendarCells = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCellEmpty} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTodos = todos.filter(todo => todo.deadline.startsWith(dateStr));

      cells.push(
        <TouchableOpacity key={`day-${day}`} style={styles.calendarCell} onPress={() => handleDatePress(day)}>
          <Text style={styles.calendarDayText}>{day}</Text>
          <ScrollView style={styles.calendarTaskScroll} showsVerticalScrollIndicator={false}>
            {dayTodos.map((todo) => {
              // 最初のタグの色を取得（なければ透明・デフォルト）
              const firstTagId = todo.tags && todo.tags[0];
              const firstTag = tags.find(t => t.id === firstTagId);
              const tagColor = firstTag ? firstTag.color : 'transparent';

              return (
                <View key={todo.id} style={[styles.calendarTaskRow, todo.repeatId ? styles.calendarTaskRowRepeat : null]}>
                  <Text style={styles.calendarTaskText} numberOfLines={1}>
                    {firstTag && <Text style={{ color: tagColor, fontWeight: 'bold' }}>● </Text>}
                    {todo.repeatId ? '[定] ' : ''}{todo.title}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      );
    }
    return cells;
  };

  let touchStartX = 0;
  const handleTouchStart = (e: any) => { touchStartX = e.nativeEvent.pageX; };
  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const dx = touchStartX - touchEndX;
    if (dx > 60 && currentTab === 0) setCurrentTab(1);
    if (dx < -60 && currentTab === 1) setCurrentTab(0);
  };

  return (
    <View style={styles.container}>
      
      {/* 1. ヘッダーエリア */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => alert('ヘルプ機能')}>
          <Text style={styles.headerIconText}>?</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerDate}>
          {(() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const date = String(today.getDate()).padStart(2, '0');
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
            return `${year}年${month}月${date}日 (${dayOfWeek})`;
          })()}
        </Text>
        
        <TouchableOpacity
          style={[styles.headerIcon, selectedFilterTagId ? { backgroundColor: '#FF2D55' } : null]}
          onPress={() => {
            if (!selectedFilterTagId) {
              // 未選択なら最初のタグを選択
              setSelectedFilterTagId(tags[0].id);
            } else {
              const currentIndex = tags.findIndex(t => t.id === selectedFilterTagId);
              if (currentIndex === tags.length - 1) {
                // 最後のタグだったらフィルター解除（すべて表示）
                setSelectedFilterTagId(null);
              } else {
                // 次のタグへ進む
                setSelectedFilterTagId(tags[currentIndex + 1].id);
              }
            }
          }}
        >
          <Text style={[styles.headerIconText, selectedFilterTagId ? { color: '#FF2D55' } : null]}>
            {selectedFilterTagId ? '絞込中' : '▲▼'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {selectedFilterTagId && (
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#868e96' }}>現在絞り込み中: </Text>
          {(() => {
            const currentFilterTag = tags.find(t => t.id === selectedFilterTagId);
            return currentFilterTag ? (
              <View style={[styles.inlineTagBadge, { backgroundColor: currentFilterTag.color, marginBottom: 0 }]}>
                <Text style={styles.inlineTagBadgeText}>{currentFilterTag.name}</Text>
              </View>
            ) : null;
          })()}
          <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setSelectedFilterTagId(null)}>
            <Text style={{ fontSize: 11, color: '#007AFF', fontWeight: 'bold' }}>解除</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* タブバー */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, currentTab === 0 && styles.tabActive]} onPress={() => setCurrentTab(0)}>
          <Text style={[styles.tabText, currentTab === 0 && styles.tabTextActive]}>リスト</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, currentTab === 1 && styles.tabActive]} onPress={() => setCurrentTab(1)}>
          <Text style={[styles.tabText, currentTab === 1 && styles.tabTextActive]}>カレンダー</Text>
        </TouchableOpacity>
      </View>

      {/* 2. メインエリア */}
      <View style={styles.mainContent} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {currentTab === 0 ? (
          /* リスト表示画面 */
          <View style={{ flex: 1 }}>
            <FlatList
              data={listTodos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.todoItem}>
                  <TouchableOpacity style={styles.checkbox} onPress={() => completeTodo(item)}>
                    <View style={styles.checkboxInner} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.textContainer} onPress={() => openDetailModal(item)}>
                    <Text style={styles.todoTitle}>
                      {item.title} {item.repeatId ? <Text style={styles.repeatBadge}>[定期]</Text> : null}
                    </Text>
                    {item.description ? <Text style={styles.todoDescription}>{item.description}</Text> : null}
                    {item.tags && item.tags.length > 0 && (
                      <View style={styles.todoItemTagContainer}>
                        {item.tags.map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <View key={tagId} style={[styles.inlineTagBadge, { backgroundColor: tag.color }]}>
                              <Text style={styles.inlineTagBadgeText}>{tag.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <Text style={styles.deadlineText}>期限: {formatDeadline(item.deadline)}</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>タスクはありません。{"\n"}下の「追加」から登録してください。</Text>}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          /* カレンダー表示画面 */
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
                <Text style={styles.monthNavText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>{currentYear}年 {currentMonth + 1}月</Text>
              <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(1)}>
                <Text style={styles.monthNavText}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekHeader}>
              {['日', '月', '火', '水', '木', '金', '土'].map((d, index) => (
                <Text key={d} style={[styles.weekText, index === 0 && styles.sundayText, index === 6 && styles.saturdayText]}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendarCells()}
            </View>
          </View>
        )}
      </View>

      {/* 3. フッターエリア */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <TouchableOpacity style={[styles.histBtn, pastHistory.length === 0 && styles.histBtnDisabled]} onPress={handleUndo} disabled={pastHistory.length === 0}>
            <Text style={styles.histBtnText}>◀ 戻る ({pastHistory.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.histBtn, { marginLeft: 5 }, futureHistory.length === 0 && styles.histBtnDisabled]} onPress={handleRedo} disabled={futureHistory.length === 0}>
            <Text style={styles.histBtnText}>進む ▶ ({futureHistory.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerCenter}>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setIsTagModalVisible(true)}>
            <Text style={styles.menuButtonText}>タグ管理</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* タスク追加モーダル */}
      <Modal animationType="slide" transparent={true} visible={isAddModalVisible} onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>タスク追加</Text>
            <ScrollView style={{ marginBottom: 15 }}>
              <TextInput style={styles.input} placeholder="タイトル（必須）" value={title} onChangeText={setTitle} />
              <TextInput style={styles.input} placeholder="概要" value={description} onChangeText={setDescription} />
              <TextInput style={styles.input} placeholder="内容" value={content} onChangeText={setContent} />
              <TextInput style={styles.input} placeholder="その他メモ" value={memo} onChangeText={setMemo} />
              <Text style={styles.modalLabel}>タグ（複数選択可）</Text>
              <View style={styles.tagSelectorContainer}>
                {tags.map((tag) => {
                  const isSelected = selectedFormTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tagChip,
                        { borderColor: tag.color },
                        isSelected && { backgroundColor: tag.color }
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          // すでに選ばれていたら除外
                          setSelectedFormTagIds(selectedFormTagIds.filter(id => id !== tag.id));
                        } else {
                          // 選ばれていなければ追加
                          setSelectedFormTagIds([...selectedFormTagIds, tag.id]);
                        }
                      }}
                    >
                      <Text style={[styles.tagChipText, { color: isSelected ? '#fff' : tag.color }]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>期限設定</Text>
              <View style={styles.dateTimeRow}>
                <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginRight: 5 }} />
                <input type="time" step="300" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...webInputStyle, width: '100px' }} />
              </View>

              <View style={styles.repeatSection}>
                <Text style={styles.sectionLabel}>繰り返し設定（任意）</Text>
                <View style={styles.dateTimeRow}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 5, marginBottom: 0 }]} placeholder="例: 3" keyboardType="numeric" value={repeatInterval} onChangeText={setRepeatInterval} />
                  <Text style={{ alignSelf: 'center', marginRight: 10, fontSize: 13 }}>日置き</Text>
                  <input type="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginBottom: 0 }} />
                  <Text style={{ alignSelf: 'center', marginLeft: 5, fontSize: 13 }}>まで</Text>
                </View>
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Button title="キャンセル" color="#666" onPress={() => setIsAddModalVisible(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="保存" color="#FF9500" onPress={addTodo} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 詳細確認モーダル */}
      <Modal animationType="fade" transparent={true} visible={isDetailModalVisible} onRequestClose={() => setIsDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTodo && (
              <ScrollView>
                <Text style={styles.modalTitle}>タスク詳細</Text>
                <Text style={styles.modalLabel}>タイトル</Text><Text style={styles.modalValue}>{selectedTodo.title}</Text>
                <Text style={styles.modalLabel}>概要</Text><Text style={styles.modalValue}>{selectedTodo.description || '---'}</Text>
                <Text style={styles.modalLabel}>内容</Text><Text style={styles.modalValue}>{selectedTodo.content || '---'}</Text>
                <Text style={styles.modalLabel}>期限</Text><Text style={styles.modalValue}>{formatDeadline(selectedTodo.deadline)}</Text>
                <Text style={styles.modalLabel}>メモ</Text><Text style={styles.modalValue}>{selectedTodo.memo || '---'}</Text>
              </ScrollView>
            )}
            <View style={{ marginTop: 15 }}><Button title="閉じる" color="#666" onPress={() => setIsDetailModalVisible(false)} /></View>
          </View>
        </View>
      </Modal>

      {/* 特定日付のタスク一覧ポップアップモーダル */}
      <Modal animationType="fade" transparent={true} visible={isDateModalVisible} onRequestClose={() => setIsDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>{selectedDateStr} のタスク</Text>
            <FlatList
              data={selectedDateTodos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.dateTodoItem}>
                  <TouchableOpacity style={styles.checkbox} onPress={() => { completeTodo(item); setIsDateModalVisible(false); }}>
                    <View style={styles.checkboxInner} />
                  </TouchableOpacity>
                  <Text style={styles.todoTitle}>{item.title}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>この日が締め切りのタスクはありません。</Text>}
            />
            <View style={{ marginTop: 15 }}><Button title="閉じる" color="#666" onPress={() => setIsDateModalVisible(false)} /></View>
          </View>
        </View>
      </Modal>

      {/* タグ管理モーダル */}
      <Modal animationType="slide" transparent={true} visible={isTagModalVisible} onRequestClose={() => setIsTagModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>タグの管理</Text>
            
            <ScrollView style={{ marginBottom: 15 }}>
              {/* 既存タグの一覧と編集 */}
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tagManageRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                    value={tag.name}
                    onChangeText={(newName) => {
                      // タグ名の変更
                      setTags(tags.map(t => t.id === tag.id ? { ...t, name: newName } : t));
                    }}
                  />
                  
                  {/* カラーパレット（簡易選択） */}
                  <View style={styles.colorPalette}>
                    {['#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#8E8E93'].map((colorCode) => (
                      <TouchableOpacity
                        key={colorCode}
                        style={[
                          styles.colorDot,
                          { backgroundColor: colorCode },
                          tag.color === colorCode && styles.colorDotSelected
                        ]}
                        onPress={() => {
                          // タグの色を変更
                          setTags(tags.map(t => t.id === tag.id ? { ...t, color: colorCode } : t));
                        }}
                      />
                    ))}
                  </View>

                  {/* タグの削除 */}
                  <TouchableOpacity
                    style={styles.tagDeleteBtn}
                    onPress={() => {
                      if (tags.length <= 1) {
                        alert('最低1つのタグは残す必要があります。');
                        return;
                      }
                      saveToHistory();
                      // タグマスターから削除
                      setTags(tags.filter(t => t.id !== tag.id));
                      // 既存タスクに紐づいているIDも外す
                      setTodos(todos.map(todo => ({
                        ...todo,
                        tags: todo.tags ? todo.tags.filter(id => id !== tag.id) : []
                      })));
                    }}
                  >
                    <Text style={styles.tagDeleteBtnText}>削除</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* 新しいタグの追加入力欄 */}
              <TouchableOpacity
                style={styles.tagAddActionBtn}
                onPress={() => {
                  saveToHistory();
                  const newTag: Tag = {
                    id: `tag-${Date.now()}`,
                    name: `新規タグ ${tags.length + 1}`,
                    color: '#8E8E93'
                  };
                  setTags([...tags, newTag]);
                }}
              >
                <Text style={styles.tagAddActionBtnText}>+ 新しいタグを追加</Text>
              </TouchableOpacity>
            </ScrollView>

            <Button title="閉じる" color="#666" onPress={() => setIsTagModalVisible(false)} />
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  header: { height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center' },
  headerIconText: { fontSize: 13, fontWeight: 'bold', color: '#495057' },
  headerDate: { fontSize: 15, fontWeight: 'bold', color: '#212529' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FF9500' },
  tabText: { fontSize: 12, color: '#868e96', fontWeight: 'bold', letterSpacing: 1 },
  tabTextActive: { color: '#FF9500' },

  mainContent: { flex: 1, padding: 10 },
  emptyText: { textAlign: 'center', color: '#adb5bd', marginTop: 30, fontSize: 13, lineHeight: 20 },

  todoItem: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#FF9500', flexDirection: 'row', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,},
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FF9500', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  checkboxPlaceholder: { width: 18, height: 18, marginRight: 12, borderWidth: 2, borderColor: '#ccc', borderRadius: 9, backgroundColor: '#eee' },
  textContainer: { flex: 1, },
  todoTitle: { fontSize: 14, fontWeight: 'bold', color: '#212529' },
  repeatBadge: { fontSize: 10, color: '#007AFF', fontWeight: 'bold' },
  todoDescription: { fontSize: 12, color: '#495057', marginTop: 2 },
  deadlineText: { fontSize: 11, color: '#FA5252', fontWeight: 'bold', marginTop: 4 },

  calendarContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthNavBtn: { padding: 10, },
  monthNavText: { fontSize: 14, color: '#495057' },
  calendarMonthTitle: { fontSize: 16, fontWeight: 'bold', color: '#212529' },
  weekHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5, marginBottom: 5 },
  weekText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#495057' },
  sundayText: { color: '#FA5252' },
  saturdayText: { color: '#228BE6' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  
  calendarCell: { width: '14.28%', height: 85, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', borderRightWidth: 1, borderRightColor: '#f8f9fa', padding: 2, justifyContent: 'flex-start', },
  calendarCellEmpty: { width: '14.28%', height: 85 },
  calendarDayText: { fontSize: 11, fontWeight: '500', color: '#212529', marginBottom: 2 },
  calendarTaskScroll: { flex: 1 },
  calendarTaskRow: { backgroundColor: '#FFF0F6', borderRadius: 2, paddingHorizontal: 2, paddingVertical: 1, marginBottom: 2 },
  calendarTaskRowRepeat: { backgroundColor: '#EBF8FF' },
  calendarTaskText: { fontSize: 9, color: '#D6336C', fontWeight: '500' },
  dateTodoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  
  footer: { height: 65, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9ecef', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 5 },
  footerLeft: { flex: 1.5, flexDirection: 'row', justifyContent: 'flex-start' },
  footerCenter: { flex: 0.8, alignItems: 'center' },
  footerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },

  histBtn: { backgroundColor: '#f1f3f5', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, minWidth: 65, alignItems: 'center' },
  histBtnDisabled: { opacity: 0.3 },
  histBtnText: { fontSize: 11, fontWeight: 'bold', color: '#495057' },
  addButton: { backgroundColor: '#FF9500', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  menuButton: { backgroundColor: '#f1f3f5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  menuButtonText: { fontSize: 12, fontWeight: 'bold', color: '#495057' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 8, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#212529', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingBottom: 6, letterSpacing: 0.5 },
  modalLabel: { fontSize: 11, fontWeight: 'bold', color: '#868e96', marginTop: 10, letterSpacing: 0.5 },
  modalValue: { fontSize: 13, color: '#212529', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, paddingHorizontal: 10, height: 36, marginBottom: 8, fontSize: 13 },
  dateTimeRow: { flexDirection: 'row', marginBottom: 5 },
  repeatSection: { backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginBottom: 5, borderWidth: 1, borderColor: '#e9ecef' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#495057', marginBottom: 5 },

  tagSelectorContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, marginBottom: 10 },
  tagChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  tagChipText: { fontSize: 11, fontWeight: 'bold' },
  todoItemTagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  inlineTagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 2 },
  inlineTagBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  // --- スタイルの末尾に追加 ---
  tagManageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', width: 100, justifyContent: 'center', marginHorizontal: 4 },
  colorDot: { width: 16, height: 16, borderRadius: 8, margin: 2, borderWidth: 1, borderColor: 'transparent' },
  colorDotSelected: { borderColor: '#000', borderWidth: 2 },
  tagDeleteBtn: { backgroundColor: '#FFE3E3', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 },
  tagDeleteBtnText: { color: '#F03E3E', fontSize: 11, fontWeight: 'bold' },
  tagAddActionBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#ced4da', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 5, marginBottom: 15 },
  tagAddActionBtnText: { color: '#495057', fontSize: 13, fontWeight: '500' },
});