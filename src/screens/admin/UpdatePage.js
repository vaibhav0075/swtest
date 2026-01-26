import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { installmentsAPI, membersAPI } from '../../services/api';

export default function UpdatePage({ navigation }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [installment, setInstallment] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedMember, setLastUpdatedMember] = useState(null);
  
  // Quick Add states
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState('');
  const [showQuickAddDatePicker, setShowQuickAddDatePicker] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await membersAPI.getAll();
      setMembers(res.data);
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

  const handleQuickAddDateChange = (event, selectedDate) => {
    setShowQuickAddDatePicker(false);
    if (selectedDate) {
      setQuickAddDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setShowMemberModal(false);
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => selectMember(item)}
    >
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberId}>ID: {item.memberId}</Text>
    </TouchableOpacity>
  );

  const handleQuickAdd = async () => {
    if (!quickAddDate) {
      Alert.alert('Error', 'Please select a date for the installments');
      return;
    }

    const memberCount = members.length;
    if (memberCount === 0) {
      Alert.alert('Error', 'No members found to add installments');
      return;
    }

    Alert.alert(
      'Confirm Quick Add',
      `Add ₹1000 installment to all ${memberCount} members on ${quickAddDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add All',
          onPress: async () => {
            setQuickAddLoading(true);
            try {
              const res = await installmentsAPI.quickAdd(1000, quickAddDate);
              const jobId = res?.data?.jobId;
              if (!jobId) {
                throw new Error('No job id returned');
              }
              // Poll for completion
              let done = false;
              while (!done) {
                await new Promise(r => setTimeout(r, 1500));
                const status = await installmentsAPI.quickAddStatus(jobId);
                const s = status?.data?.status;
                if (s === 'completed') {
                  done = true;
                  break;
                }
                if (s === 'failed') {
                  throw new Error(status?.data?.error || 'Quick add failed');
                }
              }
              Alert.alert('Success', `Installments added to ${members.length} members`);
              setShowQuickAddModal(false);
              setQuickAddDate('');
              navigation.navigate('AdminDashboard');
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to add installments');
            } finally {
              setQuickAddLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdate = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    if (!installment) {
      Alert.alert('Error', 'Please enter installment amount');
      return;
    }

    const installmentAmount = parseFloat(installment);
    if (isNaN(installmentAmount) || installmentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid installment amount');
      return;
    }

    setLoading(true);
    try {
      const saveDate = date ? date : new Date().toISOString().slice(0, 10);
      
      // Create installment record
      await installmentsAPI.create({
        memberId: selectedMember._id,
        amount: installmentAmount,
        date: saveDate
      });

      Alert.alert('Success', 'Installment recorded successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            setInstallment('1000');
            setDate('');
            setSelectedMember(null);
            setLastUpdatedMember(selectedMember);
            // Navigate back to dashboard to refresh data
            navigation.navigate('AdminDashboard');
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record installment');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMembers();
    setInstallment('1000');
    setDate('');
    setSelectedMember(null);
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
        <Text style={styles.title}>Update Member</Text>
        <TouchableOpacity 
          style={styles.quickAddButton}
          onPress={() => setShowQuickAddModal(true)}
        >
          <Icon name="plus-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
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
      {/* Installment input */}
      <Text style={styles.label}>Installment</Text>
      <TextInput
        style={[styles.input, { color: 'black' }]}
        placeholder="Enter installment amount (default: ₹1000)"
        placeholderTextColor="black"
        value={installment}
        onChangeText={setInstallment}
        keyboardType="numeric"
      />
      {/* Date input (optional) with calendar icon */}
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
        style={styles.updateButton} 
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Record Installment</Text>}
      </TouchableOpacity>

      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuickAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Add Installments</Text>
              <TouchableOpacity onPress={() => setShowQuickAddModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Add ₹1000 installment to all {members.length} members at once
            </Text>

            <Text style={styles.label}>Date</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8, color: 'black' }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="black"
                value={quickAddDate}
                onChangeText={setQuickAddDate}
              />
              <TouchableOpacity onPress={() => setShowQuickAddDatePicker(true)}>
                <Icon name="calendar" size={28} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            {showQuickAddDatePicker && (
              <DateTimePicker
                value={quickAddDate ? new Date(quickAddDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleQuickAddDateChange}
              />
            )}

            <Text style={styles.modalNote}>
              This will add ₹1000 installment to all {members.length} members on the selected date.
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, quickAddLoading && styles.disabledButton]}
              onPress={handleQuickAdd}
              disabled={quickAddLoading}
            >
              {quickAddLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalButtonText}>Add to All Members</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', marginTop: 30 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5' 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#007AFF',
    flex: 1,
    textAlign: 'center'
  },
  quickAddButton: {
    padding: 8,
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
  label: { fontSize: 16, color: '#333', marginLeft: 16, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 16, margin: 16, borderWidth: 1, borderColor: '#E5E5E5', fontSize: 16 },
  updateButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center', margin: 16 },
  updateButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 