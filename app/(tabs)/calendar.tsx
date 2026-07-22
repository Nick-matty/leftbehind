import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { AppBackground } from '../../src/components/AppBackground';
import { WeatherBoard } from '../../src/components/WeatherBoard';
import { DonutGauge } from '../../src/components/DonutGauge';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
function formatBoardDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CalendarScreen() {
  const { theme, isDark } = useThemeContext();
  const { t } = useT();
  const trips = useAppStore((s) => s.trips);
  const budgetEntries = useAppStore((s) => s.budgetEntries);
  const addBudgetEntry = useAppStore((s) => s.addBudgetEntry);

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);

  const tripDates = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((trip) => {
      let d = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      while (d <= end) {
        set.add(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setDate(d.getDate() + 1);
      }
    });
    return set;
  }, [trips]);

  const totalBudget = trips.reduce((sum, trip) => sum + (trip.budgetTotal || 0), 0);
  const totalSpent = budgetEntries.reduce((sum, e) => sum + e.amount, 0);
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const weeks: (number | null)[][] = [];
  let day = 1 - firstWeekday;
  while (day <= totalDays) {
    const week: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day >= 1 && day <= totalDays ? day : null);
      day++;
    }
    weeks.push(week);
  }

  const dayEntries = budgetEntries.filter((e) => e.date === selectedDate);
  const dayTrips = trips.filter((trip) => {
    const start = trip.startDate.slice(0, 10);
    const end = trip.endDate.slice(0, 10);
    return selectedDate >= start && selectedDate <= end;
  });

  const handleAddExpense = () => {
    if (!label.trim() || !amount) return;
    addBudgetEntry({ date: selectedDate, label: label.trim(), amount: Number(amount) || 0 });
    setLabel('');
    setAmount('');
    setModalOpen(false);
  };

  return (
    <AppBackground>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: 60,
          paddingBottom: 120,
          gap: Spacing.lg,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <WeatherBoard />

        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))}>
            <MaterialIcons name="chevron-left" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[Typography.h3, { color: theme.text }]}>
              {viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
              Today · {formatShortDate(todayStr)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))}>
            <MaterialIcons name="chevron-right" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <GlassCard padded={false} contentStyle={styles.calCard}>
          <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
            {WEEKDAYS.map((d, di) => (
              <View
                key={d}
                style={[
                  styles.dayCell,
                  styles.headerCell,
                  di < 6 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
                ]}
              >
                <Text style={[Typography.tiny, { color: theme.textTertiary, fontWeight: '700' }]}>{d}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View
              key={wi}
              style={[
                styles.weekRow,
                { borderBottomColor: theme.border },
                wi < weeks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              {week.map((d, di) => {
                const cellBorder = di < 6
                  ? { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border }
                  : null;
                if (!d) return <View key={di} style={[styles.dayCell, cellBorder]} />;
                const dateStr = toDateStr(year, month, d);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const hasTrip = tripDates.has(dateStr);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      cellBorder,
                      isSelected && { backgroundColor: isDark ? 'rgba(59,125,232,0.22)' : 'rgba(59,125,232,0.12)' },
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    accessibilityLabel={formatBoardDate(dateStr)}
                  >
                    <Text
                      style={{
                        color: isSelected || isToday ? Colors.blue : theme.text,
                        fontSize: 14,
                        fontWeight: isToday || isSelected ? '700' : '400',
                      }}
                    >
                      {d}
                    </Text>
                    {hasTrip && <View style={[styles.dot, { backgroundColor: Colors.blue }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </GlassCard>

        {/* Selected day board with full date */}
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.tiny, { color: theme.textTertiary, textTransform: 'uppercase' }]}>
                Selected day
              </Text>
              <Text style={[Typography.h3, { color: theme.text }]}>{formatBoardDate(selectedDate)}</Text>
              {selectedDate === todayStr && (
                <Text style={[Typography.tiny, { color: Colors.blue, marginTop: 2 }]}>Today</Text>
              )}
            </View>
            <MaterialIcons name="event" size={22} color={Colors.blue} />
          </View>

          {dayTrips.length > 0 && (
            <View style={{ gap: 6 }}>
              {dayTrips.map((trip) => (
                <View
                  key={trip.id}
                  style={[
                    styles.tripChip,
                    { backgroundColor: isDark ? 'rgba(59,125,232,0.18)' : Colors.blueLight },
                  ]}
                >
                  <MaterialIcons name="flight-takeoff" size={16} color={Colors.blue} />
                  <Text style={[Typography.small, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                    {trip.destination} · {formatShortDate(trip.startDate.slice(0, 10))} –{' '}
                    {formatShortDate(trip.endDate.slice(0, 10))}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {dayEntries.length === 0 ? (
            <Text style={[Typography.small, { color: theme.textSecondary }]}>
              No expenses on this date yet.
            </Text>
          ) : (
            dayEntries.map((e) => (
              <View key={e.id} style={[styles.expenseRow, { borderTopColor: theme.border }]}>
                <View>
                  <Text style={[Typography.body, { color: theme.text }]}>{e.label}</Text>
                  <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
                    {formatBoardDate(e.date)}
                  </Text>
                </View>
                <Text style={[Typography.body, { color: theme.text, fontWeight: '600' }]}>
                  ${e.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </GlassCard>

        <GlassCard>
          <View style={styles.rowBetween}>
            <Text style={[Typography.h3, { color: theme.text }]}>{t('budgetOverview')}</Text>
            <MaterialIcons name="account-balance-wallet" size={20} color={Colors.blue} />
          </View>
          <View style={[styles.budgetBody, { marginTop: Spacing.md }]}>
            <View style={{ flex: 1, gap: Spacing.sm }}>
              <View>
                <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('totalBudget')}</Text>
                <Text style={[Typography.h3, { color: theme.text }]}>${totalBudget.toFixed(2)}</Text>
              </View>
              <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                {t('spent')}: ${totalSpent.toFixed(2)}
              </Text>
              <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                {t('remaining')}: ${Math.max(0, totalBudget - totalSpent).toFixed(2)}
              </Text>
            </View>
            <DonutGauge percent={spentPct} size={112} stroke={11} label={t('spent')} />
          </View>
        </GlassCard>

        <GlassButton onPress={() => setModalOpen(true)} tint={Colors.blue}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.btnText}>{t('addExpense')}</Text>
        </GlassButton>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard strong style={{ width: '100%' }}>
            <Text style={[Typography.h3, { color: theme.text, marginBottom: Spacing.xs }]}>{t('addExpense')}</Text>
            <Text style={[Typography.small, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
              For {formatBoardDate(selectedDate)}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Label (e.g. Taxi, Dinner)"
              placeholderTextColor={theme.textTertiary}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: Spacing.sm }]}
              placeholder="Amount"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.bgTertiary }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={{ color: theme.text }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.blue }]} onPress={handleAddExpense}>
                <Text style={{ color: '#fff' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calCard: { overflow: 'hidden' },
  weekRow: { flexDirection: 'row', width: '100%' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    minWidth: 0,
  },
  headerCell: { height: 32 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  budgetBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: Spacing.lg },
  input: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  modalBtn: { flex: 1, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
