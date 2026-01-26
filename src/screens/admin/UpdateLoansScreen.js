import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { loansAPI, membersAPI } from '../../services/api';

export default function UpdateLoansScreen({ navigation }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [loanRepayment, setLoanRepayment] = useState('');
  const [interest, setInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedMember, setLastUpdatedMember] = useState(null);
  const [totalInterestAllLoans, setTotalInterestAllLoans] = useState('');

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      // Fetch all members and all loans once, then show only members with ACTIVE loans.
      const [membersRes, loansRes] = await Promise.all([
        membersAPI.getAll(),
        loansAPI.getAll()
      ]);

      const activeLoans = (loansRes.data || []).filter(loan => loan.status === 'active');
      const memberIdsWithActiveLoans = new Set(
        activeLoans
          .map(loan => {
            if (typeof loan.memberId === 'object' && loan.memberId !== null) {
              return loan.memberId._id || loan.memberId;
            }
            return loan.memberId;
          })
          .filter(Boolean)
          .map(id => id.toString())
      );

      const filteredMembers = (membersRes.data || []).filter(member =>
        memberIdsWithActiveLoans.has(member._id.toString())
      );

      setMembers(filteredMembers);
    } catch (e) {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  const checkActiveLoan = async (member) => {
    setSelectedMember(member);
    setShowMemberModal(false);
    setActiveLoans([]);
    setSelectedLoan(null);
    setLoanRepayment('');
    setInterest('');
    setTotalInterestAllLoans('');
    
    try {
      const loans = await loansAPI.getByMember(member._id);
      const actives = loans.data.filter(loan => loan.status === 'active');
      setActiveLoans(actives);
      
      if (actives.length === 0) {
        Alert.alert('No Active Loans', `${member.name} has no active loans.`);
      } else if (actives.length === 1) {
        setSelectedLoan(actives[0]);
        // Auto-calculate interest for single loan
        setInterest((actives[0].outstanding * 0.01).toFixed(2));
      } else if (actives.length > 1) {
        // For multiple loans, show combined interest across all active loans
        const totalInt = actives.reduce((sum, l) => sum + (Number(l.outstanding || 0) * 0.01), 0);
        setTotalInterestAllLoans(totalInt.toFixed(2));
        setInterest(totalInt.toFixed(2));
      }
    } catch (e) {
      setActiveLoans([]);
      setSelectedLoan(null);
      Alert.alert('Error', 'Failed to fetch loans for this member.');
    }
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => checkActiveLoan(item)}
    >
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberId}>ID: {item.memberId}</Text>
    </TouchableOpacity>
  );

  const handleLoanUpdate = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    if (!loanRepayment && activeLoans.length <= 1) {
      Alert.alert('Error', 'Please enter loan repayment amount');
      return;
    }

    const repaymentAmount = parseFloat(loanRepayment);
    if ((isNaN(repaymentAmount) || repaymentAmount < 0)) {
      Alert.alert('Error', 'Please enter a valid repayment amount (0 or greater)');
      return;
    }

    setLoading(true);
    try {
      // If multiple active loans, call the single backend endpoint once
      if (activeLoans.length > 1) {
        await loansAPI.repayMember(
          selectedMember._id,
          Number(isNaN(repaymentAmount) ? 0 : repaymentAmount),
          date || undefined
        );

        const successMessage = (Number(repaymentAmount) === 0)
          ? 'Interest distributed for all active loans'
          : 'Repayment allocated across loans and interest distributed';

        Alert.alert('Success', successMessage, [
          { 
            text: 'OK', 
            onPress: () => {
              setLoanRepayment('');
              setInterest('');
              setDate('');
              setSelectedMember(null);
              setSelectedLoan(null);
              setActiveLoans([]);
              setTotalInterestAllLoans('');
              setLastUpdatedMember(selectedMember);
              navigation.navigate('AdminDashboard');
            }
          }
        ]);
      } else {
        // Single loan flow: requires a selected loan
        if (!selectedLoan) {
          Alert.alert('Error', 'Please select a loan');
          return;
        }
        if (repaymentAmount > selectedLoan.outstanding) {
          Alert.alert('Error', 'Repayment amount cannot exceed outstanding amount');
          return;
        }

        // Add repayment to the loan (even if amount is 0, it will distribute interest)
        await loansAPI.addRepayment(
          selectedLoan._id,
          repaymentAmount,
          date || undefined
        );

        const successMessage = repaymentAmount === 0 
          ? 'Interest distributed successfully (no repayment recorded)' 
          : 'Loan repayment recorded successfully';

        Alert.alert('Success', successMessage, [
          { 
            text: 'OK', 
            onPress: () => {
              setLoanRepayment('');
              setInterest('');
              setDate('');
              setSelectedMember(null);
              setSelectedLoan(null);
              setActiveLoans([]);
              setLastUpdatedMember(selectedMember);
              // Navigate back to dashboard to refresh data
              navigation.navigate('AdminDashboard');
            }
          }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update loan');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMembers();
    setLoanRepayment('');
    setInterest('');
    setDate('');
    setSelectedMember(null);
    setSelectedLoan(null);
    setActiveLoans([]);
    setShowLoanModal(false);
    setLastUpdatedMember(null);
    setRefreshing(false);
  }, [fetchMembers]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Last Updated Section */}
      {lastUpdatedMember && (
        <View style={styles.lastUpdatedSection}>
          <Text style={styles.lastUpdatedText}>Last updated: {lastUpdatedMember.name}</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Update Loans</Text>
      </View>
      
      {/* Member selection */}
      <TouchableOpacity style={styles.selectBox} onPress={() => setShowMemberModal(true)}>
        <Text style={styles.selectText}>{selectedMember ? selectedMember.name : 'Select Member'}</Text>
        <Icon name="chevron-down" size={24} color="#007AFF" />
      </TouchableOpacity>

      <Modal
        visible={showMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Member</Text>
            {membersLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <FlatList
                data={members}
                keyExtractor={item => item._id}
                renderItem={renderMemberItem}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowMemberModal(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loan selection (show picker only if exactly 1 active loan; multi-loan will auto-allocate) */}
      {activeLoans.length > 0 && (
        <>
          {activeLoans.length === 1 && (
            <>
              <Text style={styles.label}>Select Loan</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setShowLoanModal(true)}>
                <Text style={styles.selectText}>
                  {selectedLoan ? `₹${selectedLoan.amount} (Outstanding: ₹${selectedLoan.outstanding})` : 'Select Loan'}
                </Text>
                <Icon name="chevron-down" size={24} color="#007AFF" />
              </TouchableOpacity>
            </>
          )}

          {activeLoans.length === 1 && (
          <Modal
            visible={showLoanModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowLoanModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Loan</Text>
                <FlatList
                  data={activeLoans}
                  keyExtractor={item => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.memberItem}
                      onPress={() => {
                        setSelectedLoan(item);
                        setShowLoanModal(false);
                        // Auto-calculate interest when loan is selected
                        setInterest((item.outstanding * 0.01).toFixed(2));
                      }}
                    >
                      <Text style={styles.memberName}>₹{item.amount}</Text>
                      <Text style={styles.memberId}>Outstanding: ₹{item.outstanding}</Text>
                      <Text style={styles.memberId}>Interest (1%): ₹{(item.outstanding * 0.01).toFixed(2)}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLoanModal(false)}>
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          )}

          {/* Loan details for single loan */}
          {activeLoans.length === 1 && selectedLoan && (
            <View style={styles.loanDetails}>
              <Text style={styles.loanDetailsTitle}>Loan Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Original Amount:</Text>
                <Text style={styles.detailValue}>₹{selectedLoan.amount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Outstanding Amount:</Text>
                <Text style={styles.detailValue}>₹{selectedLoan.outstanding}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest Rate:</Text>
                <Text style={styles.detailValue}>1% per repayment</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest Amount:</Text>
                <Text style={[styles.detailValue, styles.interestValue]}>₹{(selectedLoan.outstanding * 0.01).toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Repayments:</Text>
                <Text style={styles.detailValue}>₹{selectedLoan.repayments?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0}</Text>
              </View>
            </View>
          )}

          {/* Multiple loans breakdown and totals */}
          {activeLoans.length > 1 && (
            <View style={styles.loanDetails}>
              <Text style={styles.loanDetailsTitle}>Active Loans Breakdown</Text>
              {activeLoans
                .slice()
                .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
                .map((ln) => (
                  <View key={ln._id} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Loan ₹{ln.amount} | Outstanding ₹{ln.outstanding}</Text>
                    <Text style={[styles.detailValue, styles.interestValue]}>Int: ₹{(Number(ln.outstanding || 0) * 0.01).toFixed(2)}</Text>
                  </View>
              ))}
              <View style={[styles.detailRow, { marginTop: 6 }] }>
                <Text style={[styles.detailLabel, { fontWeight: 'bold' }]}>Total Interest (all active loans)</Text>
                <Text style={[styles.detailValue, styles.interestValue]}>₹{totalInterestAllLoans || '0.00'}</Text>
              </View>
              <Text style={[styles.infoText, { textAlign: 'left', marginTop: 8 }]}>
                Repayment will be applied to oldest loan first. Any remaining amount rolls into the next loan.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Loan Repayment Amount</Text>
          <TextInput
            style={[styles.input, { color: 'black' }]}
            placeholder="Enter loan repayment amount (0 for interest only)"
            placeholderTextColor="black"
            value={loanRepayment}
            onChangeText={(text) => {
              setLoanRepayment(text);
              // Recalculate interest when repayment amount changes
              if (activeLoans.length === 1 && selectedLoan) {
                setInterest((selectedLoan.outstanding * 0.01).toFixed(2));
              } else if (activeLoans.length > 1) {
                const totalInt = activeLoans.reduce((sum, l) => sum + (Number(l.outstanding || 0) * 0.01), 0);
                setInterest(totalInt.toFixed(2));
              }
            }}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Interest Amount (Auto-calculated)</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput, { color: 'black' }]}
            placeholder="Interest will be calculated automatically"
            placeholderTextColor="black"
            value={interest}
            editable={false}
          />

          <Text style={styles.infoText}>
            ℹ️ Interest (1% of outstanding per loan) will be distributed equally among all active members.
            {'\n'}💡 Enter 0 to distribute interest only without recording a repayment. With multiple loans, interest for each loan is distributed.
          </Text>
        </>
      )}

      {/* Date input (optional) */}
      <Text style={styles.label}>Date (optional)</Text>
      <View style={styles.dateInputRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8, color: 'black' }]}
          placeholder="YYYY-MM-DD (leave blank for today)"
          placeholderTextColor="black"
          value={date}
          onChangeText={setDate}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <TouchableOpacity 
        style={[styles.updateButton, (!selectedMember || (!loanRepayment && activeLoans.length <= 1)) && styles.disabledButton]} 
        onPress={handleLoanUpdate}
        disabled={loading || !selectedMember || (!loanRepayment && activeLoans.length <= 1)}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update Loan</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    marginTop: 30 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5' 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#007AFF', 
    marginLeft: 16 
  },
  selectBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    margin: 16, 
    borderWidth: 1, 
    borderColor: '#E5E5E5', 
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 50
  },
  selectText: { 
    fontSize: 16, 
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  label: { 
    fontSize: 16, 
    color: '#333', 
    marginLeft: 16, 
    marginTop: 16 
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 16, 
    margin: 16, 
    borderWidth: 1, 
    borderColor: '#E5E5E5', 
    fontSize: 16 
  },
  readOnlyInput: {
    backgroundColor: '#f8f8f8',
    color: '#666',
  },
  updateButton: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    margin: 16 
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  updateButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#007AFF',
  },
  closeModalBtn: {
    marginTop: 16,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  closeModalText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberId: {
    fontSize: 14,
    color: '#666',
  },
  loanDetails: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  loanDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  interestValue: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  lastUpdatedSection: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 16,
    color: '#555',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
});
