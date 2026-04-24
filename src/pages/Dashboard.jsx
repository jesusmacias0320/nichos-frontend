import { useState, useEffect, use } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api/axios';
import './Dashboard.css'
import Swal from 'sweetalert2';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { utils, writeFile } from "xlsx";
import {Chart as ChartJS, ArcElement, Tooltip, Legend} from 'chart.js';
import { Pie, Bar  } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const  Dashboard = () => {
    const [myNiches, setMyNiches] = useState([]);
    const [allNiches, setAllNiches] = useState([]);
    const [users, setUsers] = useState([]);
    const [history, setHistory] = useState([]);

    const [newCode, setNewCode] = useState('');
    const [newLocation, setNewLocation] = useState('');

    const [selectedNiche, setSelectedNiche] = useState(null);
    const [newOwnerId, setNewOwnerId] = useState('');
    const [transferReason, setTransferReason] = useState('');

    const [deceasedName, setDeceasedName] = useState('');

    const [birthDate, setBirthDate] = useState('');
    const [deathDate, setDeathDate] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState('inventory');
    const [inventoryPage, setInventoryPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 10;

    const [historySearchTerm, setHistorySearchTerm] = useState(''); 

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try{
              const [myRes, allRes, userRes, historyRes] = await Promise.all([
                api.get('/niches/my-niches'),
                api.get('/niches'),
                api.get('/auth/users'),
                api.get('/niches/history')
              ]);

              setMyNiches(myRes.data);
              setAllNiches(allRes.data);
              setUsers(userRes.data);
              setHistory(historyRes.data);
            }catch (err){
                console.error("Error al cargar los nichos", err);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

const handleCreateNiche = async (e) => {
    e.preventDefault();

    try{
        await api.post('/niches', {code: newCode, location: newLocation});
        
        await Swal.fire({
          title: '¡Nicho Creado!',
          text: `El nicho ${newCode} se registro correctamente en ${newLocation}.`,
          icon: 'success',
          confirmButtonColor: '#10b981'

        });

        setNewCode('');
        setNewLocation('');

        window.location.reload()
    }catch(err){
        console.error('Error al crear nicho', err);
        
        const errorMessage = err.response?.data?.error || 'Asegurate de que el codigo no este repetido.';
        Swal.fire({
          title: '¡No se pudo crear!',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
    }
  };

  const handleOpenTransfer = (niche) => {
    setSelectedNiche(niche);
  };
  const handleCloseTransfer =  () => {
    setSelectedNiche(null);
    setNewOwnerId('');
    setTransferReason('');
    setDeceasedName('');
    setBirthDate('');
    setDeathDate('');
  };

  const submitTransfer = async (e) => {
    e.preventDefault();

    if (!newOwnerId){
      Swal.fire('Atención', 'Por favor selecciona un dueño.', 'warning');
      return
    }

    try{
      await api.put(`/niches/${selectedNiche.id}/transfer`, {
        new_owner_id: newOwnerId,
        reason: transferReason,
        deceased_name: deceasedName,
        birth_date: birthDate,
        death_date: deathDate
      });
      handleCloseTransfer();

      await Swal.fire({
        title: '¡Transferencia Exitosa!',
        text: `El nicho ${selectedNiche.code} ha sido asignado.`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
      window.location.reload();
    }catch(err){
      console.error("Error en la transferencia", err);
      Swal.fire('Error al transferir. Verifica la consola');
    }
  };

  const handleReleaseNiche = async (niche) => {
    const {value: reason} = await Swal.fire({
      title: `Liberar Nicho ${niche.code}`,
      text: "El espacio volverá a estar disponible y se borrarán los datos del fallecido.",
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo de liberación (Ej: Exhumación)',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, liberar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) return '!Debes ingresar un motivo para el historial!';
      }
    });

      if (reason){
        try{
        await api.put(`/niches/${niche.id}/release`, { reason: reason });
        await Swal.fire('¡Liberado!', 'El nicho ha sido vaciado correctamente.', 'success');
        window.location.reload();

        }catch(err){
          Swal.fire('Error', 'hubo un problema para liberar el nicho', 'error')
        }
      } 
  };

  const totalNiches = allNiches.length;
  const availableNiches = allNiches.filter(niche => niche.status === 'disponible').length;
  const occupiedNiches = totalNiches - availableNiches;

  const filteredNiches = allNiches.filter((niche) => {
    
    if (!niche) return false; 
    
    const search = searchTerm.toLowerCase();
    const matchCode = niche.code?.toLowerCase().includes(search);
    const matchLocation = niche.location?.toLowerCase().includes(search);
    const matchDeceased = niche.deceased_name?.toLowerCase().includes(search);
    
    return matchCode || matchLocation || matchDeceased;
  });

  //Logica de paginación
  //Inventario
  const totalInventoryPages = Math.max(1, Math.ceil(filteredNiches.length / itemsPerPage));
  const indexOfLastInventory = inventoryPage * itemsPerPage;
  const indexOfFirstInventory = indexOfLastInventory - itemsPerPage;
  const currentInventory = filteredNiches.slice(indexOfFirstInventory, indexOfLastInventory);

  //Historial
  
  const filteredHistory = history.filter((item) => {
    
    if (!item) return false; 

    const search = historySearchTerm.toLowerCase();
    const matchNiche = item.niche_code?.toLowerCase().includes(search);
    const matchDeceased = item.deceased_name?.toLowerCase().includes(search);
    

    const dateStr = item.transfer_date ? new Date(item.transfer_date).toLocaleDateString().toLowerCase() : '';
    const matchDate = dateStr.includes(search);

    return matchNiche || matchDeceased || matchDate;
  });

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const indexOfLastHistory = historyPage * itemsPerPage;
  const indexOfFirstHistory = indexOfLastHistory - itemsPerPage;
  const currentHistory = filteredHistory.slice(indexOfFirstHistory, indexOfLastHistory);


  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Inventario de Nichos", 14, 15);
    
    const tableData = filteredNiches.map(niche => [
      niche.code, 
      niche.location, 
      niche.owner_email || 'Sin Dueño', 
      niche.status
    ]);

    // Usamos autoTable pasándole el documento
    autoTable(doc, {
      head: [['Código', 'Ubicación', 'Dueño', 'Estado']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    doc.save("Inventario_Nichos.pdf");
    Swal.fire('¡Descargado!', 'Tu reporte PDF se ha guardado.', 'success');
  };

  const exportToExcel = () => {
    // Creamos la hoja de datos
    const worksheet = utils.json_to_sheet(filteredNiches.map(n => ({
      'Código': n.code,
      'Ubicación': n.location,
      'Dueño': n.owner_email || 'Sin Dueño',
      'Fallecido': n.deceased_name || 'N/A',
      'Estado': n.status
    })));
    
    // CREAMOS EL WORKBOOK 
    const workbook = utils.book_new(); 
    
    // Metemos la hoja en el workbook
    utils.book_append_sheet(workbook, worksheet, "Inventario");
    
    // Descargamos el archivo
    writeFile(workbook, "Inventario_Nichos.xlsx");
    Swal.fire('¡Descargado!', 'Tu reporte de Excel se ha guardado.', 'success');
  };
  const pieChartData = {
    labels: ['Disponibles', 'Ocupados'],
    datasets: [
      {
        data: [availableNiches, occupiedNiches],
        backgroundColor: ['#10b981', '#ef4444'], 
        hoverBackgroundColor: ['#059669', '#dc2626'],
        borderWidth: 1,
      },
    ],
  };


  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Panel de Control Administrativo</h2>
        <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
      </header>

      {/* ESTADÍSTICAS */}
      <section className="stats-container">
        <div className="stats-cards-wrapper">
          <div className="stat-card total-nichos">
            <h4>Total de Nichos</h4>
            <span className="stat-number">{totalNiches}</span>
          </div>
          <div className="stat-card">
            <h4>Disponibles</h4>
            <span className="stat-number text-green">{availableNiches}</span>
          </div>
          <div className="stat-card">
            <h4>Ocupados / Transferidos</h4>
            <span className="stat-number text-blue">{occupiedNiches}</span>
          </div>
        </div>
        
        <div className="chart-container">
          <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </section>

      {/* REGISTRO */}
      <section className="create-section">
        <h3>Registrar Nuevo Nicho</h3>
        <form onSubmit={handleCreateNiche} className="create-form">
          <input type="text" 
          placeholder="Código (Ej: C-300)" 
          value={newCode} 
          onChange={(e) => setNewCode(e.target.value)} 
          required 
          />
          <select 
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          required
          className="form-input"
          style={{width: 'auto', minWidth: '250px'}}
          >
            <option value="">-- Seleccione una ubicación --</option>
            <option value="Pasillo Norte">Pasillo Norte</option>
            <option value="Pasillo Sur">Pasillo Sur</option>
            <option value="Pasillo Este">Pasillo Este</option>
            <option value="Pasillo Oeste">Pasillo Oeste</option>
            <option value="Nivel 1, Sector Jardín">Nivel 1, Sector Jardín</option>
            <option value="Nivel 2, Sector Jardín">Nivel 2, Sector Jardín</option>
            <option value="Nivel 3, Sector Jardín">Nivel 3, Sector Jardín</option>
          </select>
          <button type="submit" className="btn-create">Guardar Nicho</button>
        </form>
      </section>

      {/* BOTONERA DE PESTAÑAS */}
      <div className="tabs-container">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
        >
          Inventario General
        </button>
        
        <button 
          onClick={() => setActiveTab('history')}
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
           Historial de Movimientos
        </button>
      </div>

      {/* PESTAÑA: INVENTARIO */}
      {activeTab === 'inventory' && (
        <main className="table-container">
          <div className="inventory-header">
            <h3>Inventario General</h3>
            <div className="export-buttons">
              <button onClick={exportToPDF} className="btn-export-pdf">Exportar PDF</button>
              <button onClick={exportToExcel} className="btn-export-excel">Exportar Excel</button>
              <input 
                type="text" className="search-bar" placeholder="Buscar..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setInventoryPage(1); }}
              />
            </div>
          </div>
          
          <table className="niches-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Ubicación</th>
                <th>Dueño</th>
                <th>Fallecido</th>
                <th>Nacimiento</th>
                <th>Defunción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentInventory.length > 0 ? (
                currentInventory.map((niche) => (
                  <tr key={niche.id}>
                    <td><strong>{niche.code}</strong></td>
                    <td>{niche.location}</td>
                    <td className="small-text">{niche.owner_email || '---'}</td>
                    <td className="small-text">{niche.deceased_name || '---'}</td>
                    <td className="small-text">{niche.birth_date ? niche.birth_date.split('T')[0] : '---'}</td>
                    <td className="small-text">{niche.death_date ? niche.death_date.split('T')[0] : '---'}</td>
                    <td><span className={`status-badge ${niche.status}`}>{niche.status}</span></td>
                    <td>
                      {niche.status === 'disponible' ? (
                        <button className="btn-transfer" onClick={() => handleOpenTransfer(niche)}>Transferir</button>
                      ) : (
                        <button className="btn-release" onClick={() => handleReleaseNiche(niche)}>Liberar</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (<tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>No hay nichos en el sistema.</td></tr>)}
            </tbody>
          </table>

          {/* CONTROLES PAGINACIÓN INVENTARIO */}
          <div className="pagination-container">
            <button className="btn-page" disabled={inventoryPage === 1} onClick={() => setInventoryPage(prev => prev - 1)}>Anterior</button>
            <span className="pagination-info">Página {inventoryPage} de {totalInventoryPages}</span>
            <button className="btn-page" disabled={inventoryPage === totalInventoryPages} onClick={() => setInventoryPage(prev => prev + 1)}>Siguiente</button>
          </div>
        </main>
      )}

      {/* PESTAÑA: HISTORIAL */}
      {activeTab === 'history' && (
        <main className="table-container">

          <div className="history-header-container">
            <h3>Historial de Movimientos</h3>
            <input 
            type="text"
            className="form-input search-history"
            placeholder="Buscar......" 
            value={historySearchTerm}
            onChange={(e) => { setHistorySearchTerm(e.target.value); setHistoryPage(1); }}
            />
          </div>
          
          
          
          
          <div style={{ overflowX: 'auto' }}>
            <table className="niches-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nicho</th>
                  <th>Dueño Anterior</th>
                  <th>Nuevo Dueño</th>
                  <th>Fallecido</th>
                  <th>Motivo</th>
                  </tr>
              </thead>
              <tbody>
                {currentHistory.length > 0 ? (
                  currentHistory.map((item) => (
                    <tr key={item.transfer_id || item.id}>
                      <td>{new Date(item.transfer_date).toLocaleDateString()}</td>
                      <td><strong>{item.niche_code}</strong></td>
                      <td>{item.previous_owner || 'Sistema (Creación)'}</td>
                      <td>{item.new_owner || 'Ninguno (Liberado)'}</td>
                      <td className="small-text">{item.deceased_name || '---'}</td>
                      <td>{item.reason}</td>
                    </tr>
                  ))
                ) : (<tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No hay transferencias registradas aún</td></tr>)}
              </tbody>
            </table>
          </div>

          {/* CONTROLES PAGINACIÓN HISTORIAL */}
          <div className="pagination-container">
            <button className="btn-page" disabled={historyPage === 1} onClick={() => setHistoryPage(prev => prev - 1)}>Anterior</button>
            <span className="pagination-info">Página {historyPage} de {totalHistoryPages}</span>
            <button className="btn-page" disabled={historyPage === totalHistoryPages} onClick={() => setHistoryPage(prev => prev + 1)}>Siguiente</button>
          </div>
        </main>
      )}

      {/* MODAL TRANSFERENCIA */}
      {selectedNiche && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Transferir Nicho: {selectedNiche.code}</h3>
            <p>Por favor ingresa los datos de la asignación</p>

            <form onSubmit={submitTransfer}>
              <div className="form-group">
                <label>Nuevo Dueño</label>
                <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} required className="form-input">
                  <option value="">-- Seleccione un usuario --</option>
                  {users.map(user => (<option key={user.id} value={user.id}>{user.email}</option>))}
                </select>
              </div>

              <div className="form-group">
                <label>Nombre del Fallecido</label>
                <input type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} required placeholder="Ej: Juan Perez" className="form-input" />
              </div>

              <div className="form-group-flex">
                <div>
                  <label>Fecha Nacimiento</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label>Fecha Defunción</label>
                  <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label>Motivo de la Transferencia</label>
                <input type="text" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} required placeholder="Ej: Compra Directa" className="form-input" />
              </div>
                
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-cancel" onClick={handleCloseTransfer}>Cancelar</button>
                <button type="submit" className="btn-confirm">Confirmar Transferencia</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div> 
  );
};


export default Dashboard;