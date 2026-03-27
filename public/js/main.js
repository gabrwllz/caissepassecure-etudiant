// CaissePasSecure - JavaScript côté client

document.addEventListener('DOMContentLoaded', function () {
  // Validation du formulaire de transfert
  const transferForm = document.getElementById('transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', function (e) {
      const amount = document.getElementById('amount');
      const balance = parseFloat(document.getElementById('balance').value);
      const transferAmount = parseFloat(amount.value);

      if (transferAmount <= 0) {
        e.preventDefault();
        alert('Le montant doit être supérieur à 0');
        return;
      }

      if (transferAmount > balance) {
        e.preventDefault();
        alert('Solde insuffisant');
        return;
      }
    });
  }

  // Validation du formulaire d'inscription
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      const password = document.getElementById('password').value;
      const passwordConfirm = document.getElementById('password_confirm').value;

      if (password !== passwordConfirm) {
        e.preventDefault();
        alert('Les mots de passe ne correspondent pas');
        return;
      }
    });
  }

  // Confirmation de suppression
  const deleteButtons = document.querySelectorAll('.btn-delete');
  deleteButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        e.preventDefault();
      }
    });
  });

  // Auto-dismiss des messages flash après 5 secondes
  const flashMessages = document.querySelectorAll('.flash');
  flashMessages.forEach(function (flash) {
    setTimeout(function () {
      flash.style.opacity = '0';
      flash.style.transition = 'opacity 0.5s ease';
      setTimeout(function () {
        flash.remove();
      }, 500);
    }, 5000);
  });
});

function updateHiddenField(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value;
  }
}
